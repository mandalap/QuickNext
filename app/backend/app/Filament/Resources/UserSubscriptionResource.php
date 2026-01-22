<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserSubscriptionResource\Pages;
use App\Models\UserSubscription;
use Carbon\Carbon;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section as SchemaSection;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Log;

class UserSubscriptionResource extends Resource
{
    protected static ?string $model = UserSubscription::class;

    protected static ?string $navigationLabel = 'Langganan Aktif';

    protected static ?string $modelLabel = 'Langganan';

    protected static ?string $pluralModelLabel = 'Langganan';

    protected static ?int $navigationSort = 3;

    public static function getNavigationGroup(): ?string
    {
        return 'Manajemen';
    }

    public static function getNavigationIcon(): ?string
    {
        return 'heroicon-o-credit-card';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                SchemaSection::make('Informasi Langganan')
                    ->schema([
                        Forms\Components\Select::make('user_id')
                            ->label('Owner')
                            ->relationship('user', 'name', fn ($query) => $query->where('role', 'owner'))
                            ->required()
                            ->searchable()
                            ->preload()
                            ->columnSpan(1),

                        Forms\Components\Select::make('subscription_plan_id')
                            ->label('Paket')
                            ->relationship('subscriptionPlan', 'name')
                            ->required()
                            ->searchable()
                            ->preload()
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('subscription_code')
                            ->label('Kode Langganan')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->columnSpan(1),

                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'active' => 'Aktif',
                                'expired' => 'Kedaluwarsa',
                                'cancelled' => 'Dibatalkan',
                                'pending_payment' => 'Menunggu Pembayaran',
                            ])
                            ->required()
                            ->default('active')
                            ->columnSpan(1),

                        Forms\Components\TextInput::make('amount_paid')
                            ->label('Jumlah Dibayar')
                            ->numeric()
                            ->prefix('Rp')
                            ->required()
                            ->default(0)
                            ->columnSpan(1),

                        Forms\Components\Toggle::make('is_trial')
                            ->label('Trial')
                            ->default(false)
                            ->columnSpan(1),
                    ])
                    ->columns(2),

                SchemaSection::make('Periode Langganan')
                    ->schema([
                        Forms\Components\DatePicker::make('starts_at')
                            ->label('Mulai')
                            ->required()
                            ->columnSpan(1),

                        Forms\Components\DatePicker::make('ends_at')
                            ->label('Berakhir')
                            ->required()
                            ->columnSpan(1),

                        Forms\Components\DatePicker::make('trial_ends_at')
                            ->label('Trial Berakhir')
                            ->columnSpan(1)
                            ->visible(fn ($get) => $get('is_trial')),
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
            ->modifyQueryUsing(fn ($query) => $query->whereHas('user', fn ($q) => $q->where('role', 'owner')))
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Owner')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Email disalin!')
                    ->icon('heroicon-o-envelope')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('user.phone')
                    ->label('WhatsApp')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Nomor WhatsApp disalin!')
                    ->icon('heroicon-o-phone')
                    ->formatStateUsing(function ($state) {
                        if (!$state) {
                            return 'Belum diisi';
                        }
                        return $state;
                    })
                    ->color(function ($state) {
                        return $state ? 'success' : 'danger';
                    })
                    ->badge()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('subscriptionPlan.name')
                    ->label('Paket')
                    ->searchable()
                    ->sortable()
                    ->badge()
                    ->color('primary'),

                Tables\Columns\TextColumn::make('subscription_code')
                    ->label('Kode')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Kode disalin!'),

                Tables\Columns\TextColumn::make('amount_paid')
                    ->label('Jumlah Dibayar')
                    ->money('IDR', locale: 'id')
                    ->sortable()
                    ->alignEnd(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'success',
                        'expired' => 'danger',
                        'cancelled' => 'gray',
                        'pending_payment' => 'warning',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'active' => 'Aktif',
                        'expired' => 'Kedaluwarsa',
                        'cancelled' => 'Dibatalkan',
                        'pending_payment' => 'Menunggu Pembayaran',
                        default => $state,
                    })
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_trial')
                    ->label('Trial')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('starts_at')
                    ->label('Mulai')
                    ->dateTime('d F Y')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y') : '-')
                    ->sortable(),

                Tables\Columns\TextColumn::make('ends_at')
                    ->label('Berakhir')
                    ->dateTime('d F Y')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y') : '-')
                    ->sortable(),

                Tables\Columns\TextColumn::make('days_remaining')
                    ->label('Hari Tersisa')
                    ->getStateUsing(fn ($record) => $record->daysRemaining())
                    ->formatStateUsing(fn ($state) => $state > 0 ? number_format($state, 0) . ' hari' : 'Kedaluwarsa')
                    ->color(fn ($state) => $state > 7 ? 'success' : ($state > 0 ? 'warning' : 'danger'))
                    ->sortable()
                    ->alignCenter(),

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
                        'active' => 'Aktif',
                        'expired' => 'Kedaluwarsa',
                        'cancelled' => 'Dibatalkan',
                        'pending_payment' => 'Menunggu Pembayaran',
                    ]),

                Tables\Filters\TernaryFilter::make('is_trial')
                    ->label('Trial')
                    ->placeholder('Semua')
                    ->trueLabel('Trial')
                    ->falseLabel('Berbayar'),

                Tables\Filters\SelectFilter::make('subscription_plan_id')
                    ->label('Paket')
                    ->relationship('subscriptionPlan', 'name')
                    ->searchable()
                    ->preload(),

                Tables\Filters\Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Dari Tanggal'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Sampai Tanggal'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn ($query, $date) => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn ($query, $date) => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Actions\Action::make('send_whatsapp')
                    ->label('Kirim WA Perpanjangan')
                    ->icon('heroicon-o-chat-bubble-left-right')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Kirim Pesan WhatsApp Perpanjangan')
                    ->modalDescription(function (UserSubscription $record) {
                        $user = $record->user;
                        if (!$user->phone) {
                            return '⚠️ Owner belum memasukkan nomor WhatsApp. Silakan minta owner untuk menambahkan nomor WhatsApp terlebih dahulu.';
                        }
                        $daysRemaining = $record->daysRemaining();
                        return "Apakah Anda yakin ingin mengirim pesan WhatsApp perpanjangan kepada {$user->name} ({$user->phone})? Paket akan berakhir dalam {$daysRemaining} hari.";
                    })
                    ->modalSubmitActionLabel('Kirim WhatsApp')
                    ->action(function (UserSubscription $record) {
                        static::sendWhatsAppRenewal($record);
                    })
                    ->visible(fn (UserSubscription $record) => !empty($record->user->phone))
                    ->successNotificationTitle('Pesan WhatsApp berhasil dikirim'),

                Actions\ViewAction::make(),
                Actions\EditAction::make(),
            ])
            ->bulkActions([
                Actions\BulkAction::make('send_bulk_whatsapp')
                    ->label('Kirim WA ke yang Punya Nomor')
                    ->icon('heroicon-o-chat-bubble-left-right')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Kirim Pesan WhatsApp Massal')
                    ->modalDescription('Kirim pesan WhatsApp perpanjangan ke semua owner yang sudah memiliki nomor WhatsApp.')
                    ->modalSubmitActionLabel('Kirim WhatsApp')
                    ->action(function ($records) {
                        $successCount = 0;
                        $failedCount = 0;
                        $noPhoneCount = 0;

                        foreach ($records as $record) {
                            if (empty($record->user->phone)) {
                                $noPhoneCount++;
                                continue;
                            }

                            try {
                                static::sendWhatsAppRenewal($record);
                                $successCount++;
                            } catch (\Exception $e) {
                                $failedCount++;
                                \Illuminate\Support\Facades\Log::error('Failed to send WhatsApp renewal', [
                                    'subscription_id' => $record->id,
                                    'error' => $e->getMessage()
                                ]);
                            }
                        }

                        $message = "Berhasil: {$successCount}";
                        if ($failedCount > 0) {
                            $message .= ", Gagal: {$failedCount}";
                        }
                        if ($noPhoneCount > 0) {
                            $message .= ", Tidak punya nomor: {$noPhoneCount}";
                        }

                        \Filament\Notifications\Notification::make()
                            ->title('Pesan WhatsApp dikirim')
                            ->body($message)
                            ->success()
                            ->send();
                    }),
            ])
            ->defaultSort('created_at', 'desc')
            ->groups([
                Tables\Grouping\Group::make('status')
                    ->label('Status')
                    ->collapsible(),
                Tables\Grouping\Group::make('subscriptionPlan.name')
                    ->label('Paket')
                    ->collapsible(),
            ]);
    }

    public static function sendWhatsAppRenewal(UserSubscription $subscription): void
    {
        $user = $subscription->user;
        
        if (empty($user->phone)) {
            \Filament\Notifications\Notification::make()
                ->title('Gagal mengirim WhatsApp')
                ->body("Owner {$user->name} belum memasukkan nomor WhatsApp")
                ->danger()
                ->send();
            return;
        }

        $daysRemaining = $subscription->daysRemaining();
        $planName = $subscription->subscriptionPlan->name;
        $endsAt = $subscription->ends_at->locale('id')->translatedFormat('d F Y');
        $amount = number_format($subscription->amount_paid, 0, ',', '.');

        // Build WhatsApp message
        $message = static::buildRenewalWhatsAppMessage($user, $planName, $endsAt, $daysRemaining, $amount);

        // Get active WhatsApp token
        $token = \App\Models\WhatsappApiToken::where('status', 'active')->first();

        if (!$token) {
            \Filament\Notifications\Notification::make()
                ->title('Gagal mengirim WhatsApp')
                ->body('Tidak ada konfigurasi WhatsApp yang aktif. Silakan aktifkan konfigurasi WhatsApp terlebih dahulu.')
                ->danger()
                ->send();
            return;
        }

        // Format phone number
        $phone = preg_replace('/[^0-9]/', '', $user->phone);
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }

        // Prepare data
        $data = [
            'api_key' => $token->api_token,
            'sender' => $token->sender,
            'number' => $phone,
            'message' => $message,
        ];

        // Send via cURL
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $token->url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($error) {
            Log::error('WhatsApp renewal CURL error', [
                'subscription_id' => $subscription->id,
                'phone' => $phone,
                'error' => $error
            ]);
            throw new \Exception("CURL Error: {$error}");
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            Log::info('WhatsApp renewal sent successfully', [
                'subscription_id' => $subscription->id,
                'phone' => $phone,
                'http_code' => $httpCode
            ]);

            \Filament\Notifications\Notification::make()
                ->title('Pesan WhatsApp berhasil dikirim')
                ->body("Pesan perpanjangan telah dikirim ke {$user->name} ({$phone})")
                ->success()
                ->send();
        } else {
            Log::error('WhatsApp renewal API error', [
                'subscription_id' => $subscription->id,
                'phone' => $phone,
                'http_code' => $httpCode,
                'response' => $response
            ]);
            throw new \Exception("HTTP Error: {$httpCode}. Response: {$response}");
        }
    }

    protected static function buildRenewalWhatsAppMessage($user, $planName, $endsAt, $daysRemaining, $amount): string
    {
        Carbon::setLocale('id');
        $nama = $user->name ?? 'Owner';
        $sapaan = $user->sapaan ?? '';
        $fullName = trim($sapaan . ' ' . $nama);

        $urgency = '';
        if ($daysRemaining <= 7) {
            $urgency = "🚨 *SEGERA!* Paket Anda akan berakhir dalam " . number_format($daysRemaining, 0) . " hari lagi!\n\n";
        } elseif ($daysRemaining <= 14) {
            $urgency = "⚠️ *Perhatian!* Paket Anda akan berakhir dalam " . number_format($daysRemaining, 0) . " hari lagi.\n\n";
        }

        $message = "📦 *PENGINGAT PERPANJANGAN PAKET SUBSCRIPTION*\n\n" .
            "Halo *{$fullName}!*\n\n" .
            $urgency .
            "Paket subscription Anda akan segera berakhir.\n\n" .
            "📋 *Detail Paket:*\n" .
            "• Paket: *{$planName}*\n" .
            "• Berakhir: *{$endsAt}*\n" .
            "• Hari Tersisa: *" . number_format($daysRemaining, 0) . " hari*\n" .
            "• Jumlah Terakhir: *Rp {$amount}*\n\n" .
            "💡 *Aksi yang Diperlukan:*\n" .
            "Silakan segera lakukan perpanjangan paket subscription Anda untuk melanjutkan layanan tanpa gangguan.\n\n" .
            "🔗 Login ke dashboard Anda untuk melakukan perpanjangan:\n" .
            url('/') . "\n\n" .
            "Jika Anda memiliki pertanyaan atau membutuhkan bantuan, jangan ragu untuk menghubungi tim support kami.\n\n" .
            "Terima kasih atas kepercayaan Anda! 🙏\n\n" .
            "_Pesan ini dikirim otomatis_";

        return $message;
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUserSubscriptions::route('/'),
            'view' => Pages\ViewUserSubscription::route('/{record}'),
            'edit' => Pages\EditUserSubscription::route('/{record}/edit'),
        ];
    }
}

