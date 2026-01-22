<?php

namespace App\Filament\Widgets;

use App\Models\SubscriptionPayment;
use Carbon\Carbon;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Schemas\Schema;
use Filament\Widgets\ChartWidget;
use Filament\Widgets\ChartWidget\Concerns\HasFiltersSchema;
use Illuminate\Support\Facades\DB;

class SubscriptionRevenueChartWidget extends ChartWidget
{
    use HasFiltersSchema;

    protected ?string $heading = 'Grafik Pemasukan Langganan';

    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected $listeners = ['dashboard-filter-updated' => '$refresh'];

    // ✅ FIX: Hapus filter schema karena filter sekarang di dashboard
    public function filtersSchema(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    protected function getData(): array
    {
        // ✅ FIX: Baca filter dari session (dari dashboard filter)
        $filter = session('dashboard_filter', 'monthly');
        $startDate = session('dashboard_start_date') ? Carbon::parse(session('dashboard_start_date')) : null;
        $endDate = session('dashboard_end_date') ? Carbon::parse(session('dashboard_end_date')) : null;

        $labels = [];
        $revenues = [];

        switch ($filter) {
            case 'daily':
                $this->heading = 'Pemasukan Langganan (7 Hari Terakhir)';
                for ($i = 6; $i >= 0; $i--) {
                    $date = now()->subDays($i);
                    $labels[] = $date->locale('id')->translatedFormat('d M');
                    
                    $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                        ->where('status', 'paid')
                        ->whereDate('paid_at', $date)
                        ->sum('amount');
                    
                    $revenues[] = (float) $revenue;
                }
                break;

            case 'monthly':
                $this->heading = 'Pemasukan Langganan (6 Bulan Terakhir)';
                for ($i = 5; $i >= 0; $i--) {
                    $date = now()->subMonths($i);
                    $labels[] = $date->locale('id')->translatedFormat('M Y');
                    
                    $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                        ->where('status', 'paid')
                        ->whereMonth('paid_at', $date->month)
                        ->whereYear('paid_at', $date->year)
                        ->sum('amount');
                    
                    $revenues[] = (float) $revenue;
                }
                break;

            case 'yearly':
                $this->heading = 'Pemasukan Langganan (5 Tahun Terakhir)';
                for ($i = 4; $i >= 0; $i--) {
                    $year = now()->subYears($i)->year;
                    $labels[] = $year;
                    
                    $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                        ->where('status', 'paid')
                        ->whereYear('paid_at', $year)
                        ->sum('amount');
                    
                    $revenues[] = (float) $revenue;
                }
                break;

            case 'custom':
                if ($startDate && $endDate) {
                    $this->heading = 'Pemasukan Langganan (' . $startDate->format('d M Y') . ' - ' . $endDate->format('d M Y') . ')';
                    $days = $startDate->diffInDays($endDate);
                    $periods = min($days, 30); // Maksimal 30 data points
                    $interval = $days > 0 ? max(1, floor($days / $periods)) : 1;
                    
                    $currentDate = $startDate->copy();
                    while ($currentDate->lte($endDate)) {
                        $labels[] = $currentDate->locale('id')->translatedFormat('d M');
                        
                        $revenue = SubscriptionPayment::whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
                            ->where('status', 'paid')
                            ->whereDate('paid_at', $currentDate)
                            ->sum('amount');
                        
                        $revenues[] = (float) $revenue;
                        $currentDate->addDays($interval);
                        
                        if (count($labels) >= 30) break;
                    }
                } else {
                    $labels = ['Tidak ada data'];
                    $revenues = [0];
                }
                break;
        }

        return [
            'datasets' => [
                [
                    'label' => 'Pemasukan (Rp)',
                    'data' => $revenues,
                    'backgroundColor' => 'rgba(59, 130, 246, 0.5)',
                    'borderColor' => 'rgb(59, 130, 246)',
                    'borderWidth' => 2,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }

    protected function getOptions(): array
    {
        return [
            'scales' => [
                'y' => [
                    'beginAtZero' => true,
                    'ticks' => [
                        'callback' => 'function(value) { return "Rp " + value.toLocaleString("id-ID"); }',
                    ],
                ],
            ],
            'plugins' => [
                'legend' => [
                    'display' => true,
                ],
                'tooltip' => [
                    'callbacks' => [
                        'label' => 'function(context) { return "Rp " + context.parsed.y.toLocaleString("id-ID"); }',
                    ],
                ],
            ],
            'animation' => [
                'duration' => 1,
                'onComplete' => 'function() {
                    const chart = this;
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.font = "bold 12px Arial";
                    ctx.fillStyle = "#1f2937";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    
                    chart.data.datasets.forEach((dataset, datasetIndex) => {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        meta.data.forEach((bar, index) => {
                            const value = dataset.data[index];
                            if (value && value > 0) {
                                const x = bar.x;
                                const y = bar.y;
                                const formatted = "Rp " + parseFloat(value).toLocaleString("id-ID");
                                ctx.fillText(formatted, x, y - 8);
                            }
                        });
                    });
                    ctx.restore();
                }',
            ],
        ];
    }
}

