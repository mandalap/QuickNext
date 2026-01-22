<?php

namespace App\Filament\Widgets;

use App\Models\SubscriptionPlan;
use App\Models\UserSubscription;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class PopularPlanWidget extends BaseWidget
{
    protected static ?int $sort = 3;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                SubscriptionPlan::query()
                    ->withCount([
                        'userSubscriptions' => fn ($query) => $query->whereHas('user', fn ($q) => $q->where('role', 'owner'))
                    ])
                    ->orderBy('user_subscriptions_count', 'desc')
                    ->limit(10)
            )
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nama Paket')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->size('lg'),

                Tables\Columns\TextColumn::make('user_subscriptions_count')
                    ->label('Jumlah Langganan')
                    ->counts('userSubscriptions')
                    ->sortable()
                    ->alignCenter()
                    ->badge()
                    ->color('success')
                    ->formatStateUsing(fn ($state) => number_format($state, 0) . ' owner'),

                Tables\Columns\TextColumn::make('max_outlets')
                    ->label('Max Outlet')
                    ->sortable()
                    ->alignCenter()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('max_products')
                    ->label('Max Produk')
                    ->sortable()
                    ->alignCenter()
                    ->toggleable(),

                Tables\Columns\IconColumn::make('is_popular')
                    ->label('Populer')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('Aktif')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('prices.final_price')
                    ->label('Harga Mulai Dari')
                    ->getStateUsing(function ($record) {
                        $lowestPrice = $record->prices()
                            ->where('is_active', true)
                            ->orderBy('final_price', 'asc')
                            ->first();
                        return $lowestPrice ? 'Rp ' . number_format($lowestPrice->final_price, 0, ',', '.') : '-';
                    })
                    ->alignEnd(),
            ])
            ->defaultSort('user_subscriptions_count', 'desc')
            ->heading('Paket Paling Banyak Dipilih')
            ->description('Daftar paket subscription berdasarkan jumlah owner yang berlangganan');
    }
}

