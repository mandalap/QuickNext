<?php

namespace App\Filament\Resources\Outlets\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ForceDeleteBulkAction;
use Filament\Actions\RestoreBulkAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

class OutletsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('business_id')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('business_type_id')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('name')
                    ->searchable(),
                TextColumn::make('code')
                    ->searchable(),
                TextColumn::make('slug')
                    ->searchable(),
                TextColumn::make('latitude')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('longitude')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('attendance_radius')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('shift_pagi_start')
                    ->time()
                    ->sortable(),
                TextColumn::make('shift_pagi_end')
                    ->time()
                    ->sortable(),
                TextColumn::make('shift_siang_start')
                    ->time()
                    ->sortable(),
                TextColumn::make('shift_siang_end')
                    ->time()
                    ->sortable(),
                TextColumn::make('shift_malam_start')
                    ->time()
                    ->sortable(),
                TextColumn::make('shift_malam_end')
                    ->time()
                    ->sortable(),
                TextColumn::make('phone')
                    ->searchable(),
                ImageColumn::make('cover_image'),
                IconColumn::make('is_active')
                    ->boolean(),
                IconColumn::make('is_public')
                    ->boolean(),
                TextColumn::make('tax_rate')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('deleted_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('whatsapp_provider')
                    ->searchable(),
                TextColumn::make('whatsapp_phone_number')
                    ->searchable(),
                IconColumn::make('whatsapp_enabled')
                    ->boolean(),
                IconColumn::make('self_service_enabled')
                    ->label('Self Service')
                    ->boolean(),
            ])
            ->filters([
                TrashedFilter::make(),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                    ForceDeleteBulkAction::make(),
                    RestoreBulkAction::make(),
                ]),
            ]);
    }
}
