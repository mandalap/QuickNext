<?php

namespace App\Filament\Widgets;

use App\Models\Notification;
use App\Models\UserSubscription;
use Carbon\Carbon;
use Filament\Actions;
use Filament\Notifications;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ExpiringSubscriptionsWidget extends BaseWidget
{
    protected static ?int $sort = 4;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                UserSubscription::query()
                    ->whereHas('user', fn ($q) => $q->where('role', 'owner'))
                    ->where('status', 'active')
                    ->where('ends_at', '>', now())
                    ->where('ends_at', '<=', now()->addDays(30)) // Akan habis dalam 30 hari
                    ->orderBy('ends_at', 'asc')
            )
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
                    ->formatStateUsing(function ($state, $record) {
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

                Tables\Columns\TextColumn::make('ends_at')
                    ->label('Berakhir Pada')
                    ->dateTime('d F Y')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y') : '-')
                    ->sortable(),

                Tables\Columns\TextColumn::make('days_remaining')
                    ->label('Hari Tersisa')
                    ->getStateUsing(fn ($record) => $record->daysRemaining())
                    ->formatStateUsing(function ($state) {
                        if ($state <= 0) return 'Kedaluwarsa';
                        if ($state <= 7) return number_format($state, 0) . ' hari (Segera!)';
                        if ($state <= 14) return number_format($state, 0) . ' hari (Perhatian)';
                        return number_format($state, 0) . ' hari';
                    })
                    ->color(function ($state) {
                        if ($state <= 7) return 'danger';
                        if ($state <= 14) return 'warning';
                        return 'success';
                    })
                    ->sortable()
                    ->alignCenter(),

                Tables\Columns\TextColumn::make('amount_paid')
                    ->label('Jumlah Dibayar')
                    ->money('IDR', locale: 'id')
                    ->sortable()
                    ->alignEnd(),

                Tables\Columns\IconColumn::make('is_trial')
                    ->label('Trial')
                    ->boolean()
                    ->sortable(),
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
                        return "Apakah Anda yakin ingin mengirim pesan WhatsApp perpanjangan kepada {$user->name} ({$user->phone})?";
                    })
                    ->modalSubmitActionLabel('Kirim WhatsApp')
                    ->action(function (UserSubscription $record) {
                        $this->sendWhatsAppRenewal($record);
                    })
                    ->visible(fn (UserSubscription $record) => !empty($record->user->phone))
                    ->successNotificationTitle('Pesan WhatsApp berhasil dikirim'),

                Actions\Action::make('send_notification')
                    ->label('Kirim Notifikasi')
                    ->icon('heroicon-o-bell')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Kirim Notifikasi Pengingat')
                    ->modalDescription('Apakah Anda yakin ingin mengirim notifikasi pengingat kepada owner ini bahwa subscription mereka akan segera berakhir?')
                    ->modalSubmitActionLabel('Kirim')
                    ->action(function (UserSubscription $record) {
                        // Kirim notifikasi
                        $this->sendExpirationNotification($record);
                    })
                    ->successNotificationTitle('Notifikasi berhasil dikirim'),
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
                                $this->sendWhatsAppRenewal($record);
                                $successCount++;
                            } catch (\Exception $e) {
                                $failedCount++;
                                Log::error('Failed to send WhatsApp renewal', [
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

                Actions\BulkAction::make('send_bulk_notification')
                    ->label('Kirim Notifikasi ke Semua')
                    ->icon('heroicon-o-bell')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Kirim Notifikasi Massal')
                    ->modalDescription('Apakah Anda yakin ingin mengirim notifikasi pengingat kepada semua owner yang subscriptionnya akan segera berakhir?')
                    ->modalSubmitActionLabel('Kirim ke Semua')
                    ->action(function ($records) {
                        $count = 0;
                        foreach ($records as $record) {
                            $this->sendExpirationNotification($record);
                            $count++;
                        }
                        \Filament\Notifications\Notification::make()
                            ->title('Notifikasi berhasil dikirim')
                            ->body("Notifikasi telah dikirim ke {$count} owner")
                            ->success()
                            ->send();
                    }),
            ])
            ->defaultSort('ends_at', 'asc')
            ->heading('Subscription Akan Berakhir')
            ->description('Daftar owner yang subscriptionnya akan berakhir dalam 30 hari ke depan');
    }

    protected function sendExpirationNotification(UserSubscription $subscription): void
    {
        $user = $subscription->user;
        $daysRemaining = $subscription->daysRemaining();
        $planName = $subscription->subscriptionPlan->name;
        $endsAt = $subscription->ends_at->locale('id')->translatedFormat('d F Y');

        // Buat notifikasi di database (business_id bisa null untuk subscription notification)
        Notification::create([
            'business_id' => null,
            'outlet_id' => null,
            'user_id' => $user->id,
            'type' => 'subscription_expiring',
            'title' => 'Subscription Akan Berakhir',
            'message' => "Paket subscription Anda ({$planName}) akan berakhir dalam " . number_format($daysRemaining, 0) . " hari (pada {$endsAt}). Silakan perpanjang subscription Anda untuk melanjutkan layanan.",
            'data' => [
                'subscription_id' => $subscription->id,
                'days_remaining' => $daysRemaining,
                'ends_at' => $subscription->ends_at->toDateString(),
            ],
            'is_read' => false,
            'read_at' => null,
        ]);

        // Kirim email jika email tersedia
        if ($user->email) {
            try {
                Mail::send('emails.subscription-expiring', [
                    'user' => $user,
                    'subscription' => $subscription,
                    'daysRemaining' => $daysRemaining,
                    'planName' => $planName,
                    'endsAt' => $endsAt,
                ], function ($message) use ($user) {
                    $message->to($user->email, $user->name)
                        ->subject('Pengingat: Subscription Anda Akan Berakhir');
                });
            } catch (\Exception $e) {
                // Log error jika email gagal dikirim
                Log::error('Failed to send expiration email: ' . $e->getMessage());
            }
        }

        // Tampilkan notifikasi sukses
        Notifications\Notification::make()
            ->title('Notifikasi berhasil dikirim')
            ->body("Notifikasi telah dikirim ke {$user->name} ({$user->email})")
            ->success()
            ->send();
    }

    protected function sendWhatsAppRenewal(UserSubscription $subscription): void
    {
        $user = $subscription->user;
        
        if (empty($user->phone)) {
            Notifications\Notification::make()
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
        $message = $this->buildRenewalWhatsAppMessage($user, $planName, $endsAt, $daysRemaining, $amount);

        // Get active WhatsApp token
        $token = \App\Models\WhatsappApiToken::where('status', 'active')->first();

        if (!$token) {
            Notifications\Notification::make()
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

            Notifications\Notification::make()
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

    protected function buildRenewalWhatsAppMessage($user, $planName, $endsAt, $daysRemaining, $amount): string
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
}

