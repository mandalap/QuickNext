<?php

namespace App\Filament\Widgets;

use App\Models\SubscriptionPayment;
use App\Models\UserSubscription;
use Carbon\Carbon;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\DB;

class SubscriptionStatsWidget extends BaseWidget
{
    public ?string $filter = 'monthly';
    public ?string $startDate = null;
    public ?string $endDate = null;

    protected $listeners = ['dashboard-filter-updated' => '$refresh'];

    protected function getStats(): array
    {
        // ✅ FIX: Baca filter dari session (dari dashboard filter)
        $filter = session('dashboard_filter', $this->filter ?? 'monthly');
        $startDate = session('dashboard_start_date') ? Carbon::parse(session('dashboard_start_date')) : ($this->startDate ? Carbon::parse($this->startDate) : null);
        $endDate = session('dashboard_end_date') ? Carbon::parse(session('dashboard_end_date')) : ($this->endDate ? Carbon::parse($this->endDate) : null);

        // Query base untuk pembayaran
        $paymentQuery = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
            ->where('status', 'paid');

        // Apply filter berdasarkan periode
        switch ($filter) {
            case 'daily':
                $paymentQuery->whereDate('paid_at', today());
                $periodLabel = 'Hari Ini';
                break;
            case 'monthly':
                $paymentQuery->whereMonth('paid_at', now()->month)
                    ->whereYear('paid_at', now()->year);
                $periodLabel = 'Bulan ' . now()->locale('id')->translatedFormat('F Y');
                break;
            case 'yearly':
                $paymentQuery->whereYear('paid_at', now()->year);
                $periodLabel = 'Tahun ' . now()->year;
                break;
            case 'custom':
                if ($startDate && $endDate) {
                    $paymentQuery->whereBetween('paid_at', [$startDate->startOfDay(), $endDate->endOfDay()]);
                    $periodLabel = $startDate->format('d M Y') . ' - ' . $endDate->format('d M Y');
                } else {
                    $periodLabel = 'Custom';
                }
                break;
            default:
                $periodLabel = 'Semua Waktu';
        }

        // Total pemasukan berdasarkan filter
        $filteredRevenue = (clone $paymentQuery)->sum('amount');

        // Total pemasukan semua waktu
        $totalRevenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
            ->where('status', 'paid')
            ->sum('amount');

        // Total owner yang aktif subscribe
        $activeSubscribers = UserSubscription::whereHas('user', fn ($q) => $q->where('role', 'owner'))
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->distinct('user_id')
            ->count('user_id');

        // Total pembayaran berdasarkan filter
        $filteredPayments = (clone $paymentQuery)->count();

        // Chart data untuk 7 hari terakhir (jika harian) atau 6 bulan terakhir (jika bulanan/tahunan)
        $chartData = $this->getChartData($filter, $startDate, $endDate);

        return [
            Stat::make('Total Pemasukan', 'Rp ' . number_format($totalRevenue, 0, ',', '.'))
                ->description('Semua waktu')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('success')
                ->chart($chartData),

            Stat::make('Pemasukan Periode', 'Rp ' . number_format($filteredRevenue, 0, ',', '.'))
                ->description($periodLabel)
                ->descriptionIcon('heroicon-m-calendar')
                ->color('primary')
                ->chart($chartData),

            Stat::make('Owner Berlangganan', number_format($activeSubscribers, 0))
                ->description('Aktif saat ini')
                ->descriptionIcon('heroicon-m-users')
                ->color('info'),

            Stat::make('Pembayaran Periode', number_format($filteredPayments, 0))
                ->description('Transaksi ' . strtolower($periodLabel))
                ->descriptionIcon('heroicon-m-banknotes')
                ->color('warning'),
        ];
    }

    protected function getChartData(string $filter, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $data = [];

        switch ($filter) {
            case 'daily':
                // Data 7 hari terakhir
                for ($i = 6; $i >= 0; $i--) {
                    $date = now()->subDays($i);
                    $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                        ->where('status', 'paid')
                        ->whereDate('paid_at', $date)
                        ->sum('amount');
                    $data[] = (float) $revenue;
                }
                break;
            case 'monthly':
                // Data 6 bulan terakhir
                for ($i = 5; $i >= 0; $i--) {
                    $date = now()->subMonths($i);
                    $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                        ->where('status', 'paid')
                        ->whereMonth('paid_at', $date->month)
                        ->whereYear('paid_at', $date->year)
                        ->sum('amount');
                    $data[] = (float) $revenue;
                }
                break;
            case 'yearly':
                // Data 5 tahun terakhir
                for ($i = 4; $i >= 0; $i--) {
                    $year = now()->subYears($i)->year;
                    $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                        ->where('status', 'paid')
                        ->whereYear('paid_at', $year)
                        ->sum('amount');
                    $data[] = (float) $revenue;
                }
                break;
            case 'custom':
                if ($startDate && $endDate) {
                    $days = $startDate->diffInDays($endDate);
                    $periods = min($days, 30); // Maksimal 30 data points
                    $interval = $days > 0 ? $days / $periods : 1;
                    
                    for ($i = 0; $i <= $periods; $i++) {
                        $date = $startDate->copy()->addDays($i * $interval);
                        if ($date->gt($endDate)) break;
                        
                        $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                            ->where('status', 'paid')
                            ->whereDate('paid_at', $date)
                            ->sum('amount');
                        $data[] = (float) $revenue;
                    }
                }
                break;
        }

        return $data ?: [0, 0, 0, 0, 0, 0, 0];
    }
}

