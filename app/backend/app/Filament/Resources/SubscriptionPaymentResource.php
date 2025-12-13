<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SubscriptionPaymentResource\Pages;
use App\Models\SubscriptionPayment;
use Carbon\Carbon;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section as SchemaSection;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class SubscriptionPaymentResource extends Resource
{
    protected static ?string $model = SubscriptionPayment::class;

    protected static ?string $navigationLabel = 'Pembayaran Langganan';

    protected static ?string $modelLabel = 'Pembayaran';

    protected static ?string $pluralModelLabel = 'Pembayaran';

    protected static ?int $navigationSort = 4;

    public static function getNavigationGroup(): ?string
    {
        return 'Manajemen';
    }

    public static function getNavigationIcon(): ?string
    {
        return 'heroicon-o-banknotes';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                SchemaSection::make('Informasi Pembayaran')
                    ->schema([
                        Forms\Components\Select::make('user_subscription_id')
                            ->label('Langganan')
                            ->relationship('userSubscription', 'subscription_code', fn ($query) => 
                                $query->whereHas('user', fn ($q) => $q->where('role', 'owner'))
                            )
                            ->required()
                            ->searchable()
                            ->preload()
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('payment_code')
                            ->label('Kode Pembayaran')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('amount')
                            ->label('Jumlah')
                            ->numeric()
                            ->prefix('Rp')
                            ->required()
                            ->columnSpan(1),

                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'pending' => 'Menunggu',
                                'paid' => 'Dibayar',
                                'failed' => 'Gagal',
                                'expired' => 'Kedaluwarsa',
                                'cancelled' => 'Dibatalkan',
                            ])
                            ->required()
                            ->default('pending')
                            ->columnSpan(1),

                        Forms\Components\Select::make('payment_method')
                            ->label('Metode Pembayaran')
                            ->options([
                                'bank_transfer' => 'Transfer Bank',
                                'credit_card' => 'Kartu Kredit',
                                'debit_card' => 'Kartu Debit',
                                'e_wallet' => 'E-Wallet',
                                'midtrans' => 'Midtrans',
                            ])
                            ->columnSpan(1),

                        Forms\Components\Select::make('payment_gateway')
                            ->label('Payment Gateway')
                            ->options([
                                'midtrans' => 'Midtrans',
                                'manual' => 'Manual',
                            ])
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('gateway_payment_id')
                            ->label('ID Pembayaran Gateway')
                            ->maxLength(255)
                            ->columnSpan(1),

                        Forms\Components\DatePicker::make('paid_at')
                            ->label('Tanggal Dibayar')
                            ->columnSpan(1),

                        Forms\Components\DatePicker::make('expires_at')
                            ->label('Kedaluwarsa')
                            ->columnSpan(1),
                    ])
                    ->columns(2),

                SchemaSection::make('Catatan')
                    ->schema([
                        Forms\Components\Textarea::make('notes')
                            ->label('Catatan')
                            ->rows(3)
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn ($query) => 
                $query->whereHas('userSubscription.user', fn ($q) => $q->where('role', 'owner'))
            )
            ->columns([
                Tables\Columns\TextColumn::make('userSubscription.user.name')
                    ->label('Owner')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('userSubscription.subscriptionPlan.name')
                    ->label('Paket')
                    ->searchable()
                    ->badge()
                    ->color('primary'),

                Tables\Columns\TextColumn::make('payment_code')
                    ->label('Kode Pembayaran')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Kode disalin!'),

                Tables\Columns\TextColumn::make('amount')
                    ->label('Jumlah')
                    ->money('IDR', locale: 'id')
                    ->sortable()
                    ->alignEnd()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'paid' => 'success',
                        'pending' => 'warning',
                        'failed' => 'danger',
                        'expired' => 'gray',
                        'cancelled' => 'gray',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'pending' => 'Menunggu',
                        'paid' => 'Dibayar',
                        'failed' => 'Gagal',
                        'expired' => 'Kedaluwarsa',
                        'cancelled' => 'Dibatalkan',
                        default => $state,
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('payment_method')
                    ->label('Metode')
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'bank_transfer' => 'Transfer Bank',
                        'credit_card' => 'Kartu Kredit',
                        'debit_card' => 'Kartu Debit',
                        'e_wallet' => 'E-Wallet',
                        'midtrans' => 'Midtrans',
                        default => $state ?? '-',
                    })
                    ->toggleable(),

                Tables\Columns\TextColumn::make('payment_gateway')
                    ->label('Gateway')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('paid_at')
                    ->label('Dibayar')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : '-')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('expires_at')
                    ->label('Kedaluwarsa')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : '-')
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
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'pending' => 'Menunggu',
                        'paid' => 'Dibayar',
                        'failed' => 'Gagal',
                        'expired' => 'Kedaluwarsa',
                        'cancelled' => 'Dibatalkan',
                    ]),

                Tables\Filters\SelectFilter::make('payment_method')
                    ->label('Metode Pembayaran')
                    ->options([
                        'bank_transfer' => 'Transfer Bank',
                        'credit_card' => 'Kartu Kredit',
                        'debit_card' => 'Kartu Debit',
                        'e_wallet' => 'E-Wallet',
                        'midtrans' => 'Midtrans',
                    ]),

                Tables\Filters\SelectFilter::make('user_subscription_id')
                    ->label('Langganan')
                    ->relationship('userSubscription', 'subscription_code', fn ($query) => 
                        $query->whereHas('user', fn ($q) => $q->where('role', 'owner'))
                    )
                    ->searchable()
                    ->preload(),

                Tables\Filters\Filter::make('paid_at')
                    ->form([
                        Forms\Components\DatePicker::make('paid_from')
                            ->label('Dari Tanggal'),
                        Forms\Components\DatePicker::make('paid_until')
                            ->label('Sampai Tanggal'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when(
                                $data['paid_from'],
                                fn ($query, $date) => $query->whereDate('paid_at', '>=', $date),
                            )
                            ->when(
                                $data['paid_until'],
                                fn ($query, $date) => $query->whereDate('paid_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\EditAction::make(),
            ])
            ->defaultSort('created_at', 'desc')
            ->groups([
                Tables\Grouping\Group::make('status')
                    ->label('Status')
                    ->collapsible(),
                Tables\Grouping\Group::make('paid_at')
                    ->label('Tanggal Pembayaran')
                    ->date()
                    ->collapsible(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSubscriptionPayments::route('/'),
            'view' => Pages\ViewSubscriptionPayment::route('/{record}'),
            'edit' => Pages\EditSubscriptionPayment::route('/{record}/edit'),
        ];
    }
}

