<?php

namespace App\Filament\Pages;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Pages\Dashboard as BaseDashboard;
use Illuminate\Contracts\Support\Htmlable;

class CustomDashboard extends BaseDashboard implements HasForms
{
    use InteractsWithForms;

    public ?string $filter = 'monthly';
    public ?string $startDate = null;
    public ?string $endDate = null;

    protected static ?string $navigationLabel = 'Dashboard';

    protected static ?string $title = 'Dashboard';

    public function mount(): void
    {
        // Load filter dari session jika ada
        $this->filter = session('dashboard_filter', 'monthly');
        $this->startDate = session('dashboard_start_date');
        $this->endDate = session('dashboard_end_date');

        $this->form->fill([
            'filter' => $this->filter,
            'startDate' => $this->startDate,
            'endDate' => $this->endDate,
        ]);
    }

    public function getHeading(): string | Htmlable
    {
        return 'Dashboard';
    }

    public function getSubheading(): string | Htmlable | null
    {
        $filter = $this->filter ?? 'monthly';
        $startDate = $this->startDate ? \Carbon\Carbon::parse($this->startDate) : null;
        $endDate = $this->endDate ? \Carbon\Carbon::parse($this->endDate) : null;

        switch ($filter) {
            case 'daily':
                return 'Data untuk hari ini';
            case 'monthly':
                return 'Data untuk bulan ' . now()->locale('id')->translatedFormat('F Y');
            case 'yearly':
                return 'Data untuk tahun ' . now()->year;
            case 'custom':
                if ($startDate && $endDate) {
                    return 'Data dari ' . $startDate->format('d M Y') . ' sampai ' . $endDate->format('d M Y');
                }
                return 'Pilih periode custom';
            default:
                return 'Semua data';
        }
    }

    protected function getHeaderActions(): array
    {
        return [];
    }

    public function updatedFilter(): void
    {
        if ($this->filter !== 'custom') {
            $this->startDate = null;
            $this->endDate = null;
        }
        $this->saveFilter();
    }

    public function updatedStartDate(): void
    {
        $this->saveFilter();
    }

    public function updatedEndDate(): void
    {
        $this->saveFilter();
    }

    protected function saveFilter(): void
    {
        // Simpan filter ke session agar widget bisa membaca
        session([
            'dashboard_filter' => $this->filter,
            'dashboard_start_date' => $this->startDate,
            'dashboard_end_date' => $this->endDate,
        ]);

        // Refresh semua widget
        $this->dispatch('dashboard-filter-updated');
    }

    protected function getHeaderWidgets(): array
    {
        return [];
    }

    protected function getFooterWidgets(): array
    {
        return [];
    }

    public function getView(): string
    {
        return 'filament.pages.custom-dashboard';
    }
}

