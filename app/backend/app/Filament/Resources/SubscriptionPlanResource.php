<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SubscriptionPlanResource\Pages;
use App\Filament\Resources\SubscriptionPlanResource\RelationManagers\PricesRelationManager;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;
use Filament\Actions;
use Filament\Forms;
use Filament\Panel;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section as SchemaSection;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class SubscriptionPlanResource extends Resource
{
    protected static ?string $model = SubscriptionPlan::class;

    protected static ?string $navigationLabel = 'Paket Berlangganan';

    protected static ?string $modelLabel = 'Paket Berlangganan';

    protected static ?string $pluralModelLabel = 'Paket Berlangganan';

    protected static ?int $navigationSort = 2;

    public static function getNavigationGroup(): ?string
    {
        return 'Manajemen';
    }

    public static function getNavigationIcon(): ?string
    {
        return 'heroicon-o-credit-card';
    }

    public static function getSlug(?Panel $panel = null): string
    {
        return 'subscription-plans';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                SchemaSection::make('Informasi Paket')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Nama Paket')
                            ->required()
                            ->maxLength(255)
                            ->live(onBlur: true)
                            ->afterStateUpdated(function ($state, Forms\Set $set) {
                                $set('slug', Str::slug($state));
                            })
                            ->columnSpan(2),

                        Forms\Components\TextInput::make('slug')
                            ->label('Slug')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255)
                            ->disabled()
                            ->dehydrated()
                            ->columnSpan(1),

                        Forms\Components\Textarea::make('description')
                            ->label('Deskripsi')
                            ->rows(3)
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('cta_text')
                            ->label('CTA Text')
                            ->placeholder('Contoh: Paling Populer, Mulai Sekarang')
                            ->maxLength(255)
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('sort_order')
                            ->label('Urutan')
                            ->numeric()
                            ->default(0)
                            ->columnSpan(1),
                    ])
                    ->columns(3),

                SchemaSection::make('Limit & Fitur')
                    ->schema([
                        Forms\Components\TextInput::make('max_businesses')
                            ->label('Maksimal Bisnis')
                            ->numeric()
                            ->default(1)
                            ->required()
                            ->minValue(-1)
                            ->helperText('Maksimal jumlah bisnis yang bisa dibuat. -1 untuk unlimited, 1 untuk basic, dll.')
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('max_outlets')
                            ->label('Maksimal Outlet')
                            ->numeric()
                            ->default(1)
                            ->required()
                            ->minValue(0)
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('max_products')
                            ->label('Maksimal Produk')
                            ->numeric()
                            ->default(100)
                            ->required()
                            ->minValue(0)
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('max_employees')
                            ->label('Maksimal Karyawan')
                            ->numeric()
                            ->default(5)
                            ->required()
                            ->minValue(0)
                            ->columnSpan(1),

                        Forms\Components\Toggle::make('has_online_integration')
                            ->label('Integrasi Online')
                            ->default(false)
                            ->columnSpan(1),

                        Forms\Components\Toggle::make('has_advanced_reports')
                            ->label('Laporan Advanced')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Fitur laporan advanced (opsional)'),

                        Forms\Components\Toggle::make('has_reports_access')
                            ->label('Akses Laporan')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Aktifkan untuk memberikan akses ke semua laporan')
                            ->required(),

                        Forms\Components\Toggle::make('has_api_access')
                            ->label('Akses API')
                            ->default(false)
                            ->columnSpan(1),
                    ])
                    ->columns(3),

                SchemaSection::make('Fitur Premium')
                    ->description('Aktifkan fitur premium yang bisa diakses oleh paket ini')
                    ->schema([
                        Forms\Components\Toggle::make('has_kitchen_access')
                            ->label('Akses Dapur')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Akses ke modul Dapur'),

                        Forms\Components\Toggle::make('has_tables_access')
                            ->label('Akses Meja')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Akses ke modul Meja'),

                        Forms\Components\Toggle::make('has_attendance_access')
                            ->label('Akses Absensi')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Akses ke modul Absensi'),

                        Forms\Components\Toggle::make('has_inventory_access')
                            ->label('Akses Bahan & Resep')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Akses ke modul Bahan & Resep'),

                        Forms\Components\Toggle::make('has_promo_access')
                            ->label('Akses Diskon & Promo')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Akses ke modul Diskon & Promo'),

                        Forms\Components\Toggle::make('has_stock_transfer_access')
                            ->label('Akses Transfer Stok')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Akses ke modul Transfer Stok'),

                        Forms\Components\Toggle::make('has_self_service_access')
                            ->label('Akses Self Service')
                            ->default(false)
                            ->columnSpan(1)
                            ->helperText('Akses ke modul Self Service'),

                        Forms\Components\Toggle::make('has_multi_location')
                            ->label('Multi Lokasi')
                            ->default(false)
                            ->columnSpan(1),
                    ])
                    ->columns(3),

                SchemaSection::make('Fitur Tambahan')
                    ->schema([
                        Forms\Components\Repeater::make('features')
                            ->label('Daftar Fitur')
                            ->schema([
                                Forms\Components\TextInput::make('feature')
                                    ->label('Fitur')
                                    ->required()
                                    ->maxLength(255),
                            ])
                            ->defaultItems(1)
                            ->itemLabel(fn (array $state): ?string => $state['feature'] ?? null)
                            ->collapsible()
                            ->columnSpanFull(),
                    ]),

                SchemaSection::make('Status')
                    ->schema([
                        Forms\Components\Toggle::make('is_active')
                            ->label('Aktif')
                            ->default(true)
                            ->columnSpan(1),

                        Forms\Components\Toggle::make('is_popular')
                            ->label('Populer')
                            ->default(false)
                            ->columnSpan(1),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nama Paket')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('max_outlets')
                    ->label('Max Outlet')
                    ->sortable()
                    ->alignCenter(),

                Tables\Columns\TextColumn::make('max_products')
                    ->label('Max Produk')
                    ->sortable()
                    ->alignCenter()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('max_employees')
                    ->label('Max Karyawan')
                    ->sortable()
                    ->alignCenter()
                    ->toggleable(),

                Tables\Columns\IconColumn::make('has_online_integration')
                    ->label('Online')
                    ->boolean()
                    ->toggleable(),

                Tables\Columns\IconColumn::make('has_reports_access')
                    ->label('Akses Laporan')
                    ->boolean()
                    ->toggleable()
                    ->sortable(),

                Tables\Columns\IconColumn::make('has_advanced_reports')
                    ->label('Reports Advanced')
                    ->boolean()
                    ->toggleable(),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('Aktif')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_popular')
                    ->label('Populer')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('prices_count')
                    ->label('Jumlah Harga')
                    ->counts('prices')
                    ->sortable()
                    ->alignCenter(),

                Tables\Columns\TextColumn::make('sort_order')
                    ->label('Urutan')
                    ->sortable()
                    ->toggleable(),

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

                Tables\Filters\TernaryFilter::make('is_popular')
                    ->label('Populer')
                    ->placeholder('Semua')
                    ->trueLabel('Populer')
                    ->falseLabel('Tidak Populer'),

                Tables\Filters\TernaryFilter::make('has_online_integration')
                    ->label('Integrasi Online')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_reports_access')
                    ->label('Akses Laporan')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_kitchen_access')
                    ->label('Akses Dapur')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_tables_access')
                    ->label('Akses Meja')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_attendance_access')
                    ->label('Akses Absensi')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_inventory_access')
                    ->label('Akses Bahan & Resep')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_promo_access')
                    ->label('Akses Diskon & Promo')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_stock_transfer_access')
                    ->label('Akses Transfer Stok')
                    ->placeholder('Semua'),

                Tables\Filters\TernaryFilter::make('has_advanced_reports')
                    ->label('Laporan Advanced')
                    ->placeholder('Semua'),
            ])
            ->actions([
                Actions\ViewAction::make(),
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
            ->defaultSort('sort_order', 'asc');
    }

    public static function getRelations(): array
    {
        return [
            PricesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSubscriptionPlans::route('/'),
            'create' => Pages\CreateSubscriptionPlan::route('/create'),
            'view' => Pages\ViewSubscriptionPlan::route('/{record}'),
            'edit' => Pages\EditSubscriptionPlan::route('/{record}/edit'),
        ];
    }
}

