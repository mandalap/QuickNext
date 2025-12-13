@php
    $widgets = $this->getWidgets();
@endphp

<x-filament-panels::page>
    {{-- Filter Section --}}
    <div class="mb-6">
        <x-filament::section>
            <x-slot name="heading">
                Filter Periode
            </x-slot>
            <x-slot name="description">
                Pilih periode untuk melihat data dashboard. Semua widget akan otomatis ter-update sesuai filter yang dipilih.
            </x-slot>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Periode
                    </label>
                    <select wire:model.live="filter" class="fi-input block w-full rounded-lg border-gray-300 shadow-sm transition duration-75 focus:border-primary-500 focus:ring-1 focus:ring-inset focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:dark:bg-gray-800 disabled:dark:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 sm:text-sm">
                        <option value="daily">Hari Ini</option>
                        <option value="monthly">Bulan Ini</option>
                        <option value="yearly">Tahun Ini</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                
                <div>
                    @if($filter === 'custom')
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Dari Tanggal
                        </label>
                        <input type="date" wire:model.live="startDate" class="fi-input block w-full rounded-lg border-gray-300 shadow-sm transition duration-75 focus:border-primary-500 focus:ring-1 focus:ring-inset focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:dark:bg-gray-800 disabled:dark:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 sm:text-sm" />
                    @endif
                </div>
                
                <div>
                    @if($filter === 'custom')
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Sampai Tanggal
                        </label>
                        <input type="date" wire:model.live="endDate" class="fi-input block w-full rounded-lg border-gray-300 shadow-sm transition duration-75 focus:border-primary-500 focus:ring-1 focus:ring-inset focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:dark:bg-gray-800 disabled:dark:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-primary-500 sm:text-sm" />
                    @endif
                </div>
            </div>
        </x-filament::section>
    </div>

    {{-- Widgets --}}
    <x-filament-widgets::widgets
        :widgets="$widgets"
        :columns="$this->getColumns()"
    />
</x-filament-panels::page>

