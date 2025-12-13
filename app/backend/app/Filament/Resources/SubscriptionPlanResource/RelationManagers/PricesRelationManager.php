<?php

namespace App\Filament\Resources\SubscriptionPlanResource\RelationManagers;

use Carbon\Carbon;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class PricesRelationManager extends RelationManager
{
    protected static string $relationship = 'prices';

    protected static ?string $title = 'Harga Paket';

    protected static ?string $modelLabel = 'Harga';

    protected static ?string $pluralModelLabel = 'Harga';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\Select::make('duration_type')
                    ->label('Tipe Durasi')
                    ->options([
                        'monthly' => 'Bulanan',
                        'quarterly' => 'Triwulan (3 Bulan)',
                        'semi_annual' => 'Semester (6 Bulan)',
                        'annual' => 'Tahunan (12 Bulan)',
                    ])
                    ->required()
                    ->live()
                    ->columnSpan(1),

                Forms\Components\TextInput::make('duration_months')
                    ->label('Durasi (Bulan)')
                    ->numeric()
                    ->required()
                    ->default(1)
                    ->minValue(0)
                    ->maxValue(12)
                    ->columnSpan(1),

                Forms\Components\TextInput::make('price')
                    ->label('Harga Awal')
                    ->numeric()
                    ->required()
                    ->prefix('Rp')
                    ->minValue(0)
                    ->step(1000)
                    ->live(onBlur: true)
                    ->afterStateUpdated(function ($state, Forms\Set $set, Forms\Get $get) {
                        $price = floatval($state);
                        $discount = floatval($get('discount_percentage') ?? 0);
                        $finalPrice = $price - ($price * $discount / 100);
                        $set('final_price', $finalPrice);
                    })
                    ->columnSpan(1),

                Forms\Components\TextInput::make('discount_percentage')
                    ->label('Diskon (%)')
                    ->numeric()
                    ->default(0)
                    ->minValue(0)
                    ->maxValue(100)
                    ->suffix('%')
                    ->live(onBlur: true)
                    ->afterStateUpdated(function ($state, Forms\Set $set, Forms\Get $get) {
                        $price = floatval($get('price') ?? 0);
                        $discount = floatval($state);
                        $finalPrice = $price - ($price * $discount / 100);
                        $set('final_price', $finalPrice);
                    })
                    ->columnSpan(1),

                Forms\Components\TextInput::make('final_price')
                    ->label('Harga Final')
                    ->numeric()
                    ->required()
                    ->prefix('Rp')
                    ->minValue(0)
                    ->step(1000)
                    ->disabled()
                    ->dehydrated()
                    ->columnSpan(1),

                Forms\Components\Toggle::make('is_active')
                    ->label('Aktif')
                    ->default(true)
                    ->columnSpan(1),
            ])
            ->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('duration_type')
            ->columns([
                Tables\Columns\TextColumn::make('duration_type')
                    ->label('Tipe Durasi')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'monthly' => 'Bulanan',
                        'quarterly' => 'Triwulan (3 Bulan)',
                        'semi_annual' => 'Semester (6 Bulan)',
                        'annual' => 'Tahunan (12 Bulan)',
                        default => $state,
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('duration_months')
                    ->label('Durasi')
                    ->formatStateUsing(fn ($state) => $state . ' Bulan')
                    ->sortable()
                    ->alignCenter(),

                Tables\Columns\TextColumn::make('price')
                    ->label('Harga Awal')
                    ->money('IDR', locale: 'id')
                    ->sortable(),

                Tables\Columns\TextColumn::make('discount_percentage')
                    ->label('Diskon')
                    ->formatStateUsing(fn ($state) => number_format($state, 2) . '%')
                    ->sortable()
                    ->alignCenter()
                    ->color(fn ($state) => $state > 0 ? 'success' : 'gray'),

                Tables\Columns\TextColumn::make('final_price')
                    ->label('Harga Final')
                    ->money('IDR', locale: 'id')
                    ->sortable()
                    ->weight('bold')
                    ->color('success'),

                Tables\Columns\TextColumn::make('price_per_month')
                    ->label('Harga/Bulan')
                    ->getStateUsing(function ($record) {
                        if ($record->duration_months > 0) {
                            return $record->final_price / $record->duration_months;
                        }
                        return 0;
                    })
                    ->money('IDR', locale: 'id')
                    ->sortable()
                    ->alignCenter(),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('Aktif')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Dibuat')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : '-')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Status Aktif')
                    ->placeholder('Semua')
                    ->trueLabel('Aktif')
                    ->falseLabel('Tidak Aktif'),

                Tables\Filters\SelectFilter::make('duration_type')
                    ->label('Tipe Durasi')
                    ->options([
                        'monthly' => 'Bulanan',
                        'quarterly' => 'Triwulan',
                        'semi_annual' => 'Semester',
                        'annual' => 'Tahunan',
                    ]),
            ])
            ->headerActions([
                Actions\CreateAction::make(),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                    Actions\BulkAction::make('activate')
                        ->label('Aktifkan')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->action(function ($records) {
                            $records->each(function ($record) {
                                $record->update(['is_active' => true]);
                            });
                        })
                        ->requiresConfirmation(),
                    Actions\BulkAction::make('deactivate')
                        ->label('Nonaktifkan')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->action(function ($records) {
                            $records->each(function ($record) {
                                $record->update(['is_active' => false]);
                            });
                        })
                        ->requiresConfirmation(),
                ]),
            ])
            ->defaultSort('duration_months', 'asc');
    }
}

