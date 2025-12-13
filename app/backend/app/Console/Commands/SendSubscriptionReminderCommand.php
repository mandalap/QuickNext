<?php

namespace App\Console\Commands;

use App\Models\UserSubscription;
use App\Models\WhatsappApiToken;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendSubscriptionReminderCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send WhatsApp reminders for subscriptions that are expiring or expired';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting subscription reminder check...');
        
        // Set timezone to Asia/Jakarta
        $now = Carbon::now('Asia/Jakarta');
        $today = $now->format('Y-m-d');
        
        // Days to check: before expiry (7, 3, 1, 0) and after expiry (1, 3, 7)
        $daysToCheck = [-7, -3, -1, 0, 1, 3, 7];
        
        $totalSent = 0;
        $totalFailed = 0;
        $totalSkipped = 0;

        foreach ($daysToCheck as $days) {
            $targetDate = $now->copy()->addDays($days)->format('Y-m-d');
            
            $this->info("Checking subscriptions for day {$days} (target date: {$targetDate})...");
            
            // For expired subscriptions (days >= 0), also check expired status
            $query = UserSubscription::whereHas('user', fn ($q) => $q->where('role', 'owner'))
                ->whereDate('ends_at', $targetDate)
                ->with(['user', 'subscriptionPlan']);
            
            if ($days >= 0) {
                // After expiry, check both active and expired status
                $query->whereIn('status', ['active', 'expired']);
            } else {
                // Before expiry, only active
                $query->where('status', 'active');
            }
            
            $subscriptions = $query->get();

            $this->info("Found {$subscriptions->count()} subscription(s) for day {$days}");

            foreach ($subscriptions as $subscription) {
                try {
                    // Skip if user doesn't have phone number
                    if (empty($subscription->user->phone)) {
                        $totalSkipped++;
                        $this->warn("Skipping {$subscription->user->name} - no phone number");
                        continue;
                    }

                    // Send WhatsApp
                    $this->sendWhatsAppReminder($subscription, $days);
                    $totalSent++;
                    $this->info("✓ Sent reminder to {$subscription->user->name} (day {$days})");

                } catch (\Exception $e) {
                    $totalFailed++;
                    $this->error("✗ Failed to send to {$subscription->user->name}: " . $e->getMessage());
                    Log::error('Subscription reminder failed', [
                        'subscription_id' => $subscription->id,
                        'user_id' => $subscription->user_id,
                        'days' => $days,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        $this->newLine();
        $this->info("Summary:");
        $this->info("  ✓ Sent: {$totalSent}");
        $this->info("  ✗ Failed: {$totalFailed}");
        $this->info("  ⊘ Skipped (no phone): {$totalSkipped}");
        $this->info("Total processed: " . ($totalSent + $totalFailed + $totalSkipped));

        return Command::SUCCESS;
    }

    protected function sendWhatsAppReminder(UserSubscription $subscription, int $days): void
    {
        $user = $subscription->user;
        $daysRemaining = $subscription->daysRemaining();
        $planName = $subscription->subscriptionPlan->name;
        $endsAt = Carbon::parse($subscription->ends_at)->locale('id')->translatedFormat('d F Y');
        $amount = number_format($subscription->amount_paid, 0, ',', '.');

        // Build message based on days
        $message = $this->buildReminderMessage($user, $planName, $endsAt, $days, $amount);

        // Get active WhatsApp token
        $token = WhatsappApiToken::where('status', 'active')->first();

        if (!$token) {
            throw new \Exception('No active WhatsApp configuration found');
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
            throw new \Exception("CURL Error: {$error}");
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \Exception("HTTP Error: {$httpCode}. Response: {$response}");
        }

        Log::info('Subscription reminder sent', [
            'subscription_id' => $subscription->id,
            'user_id' => $user->id,
            'phone' => $phone,
            'days' => $days,
            'http_code' => $httpCode
        ]);
    }

    protected function buildReminderMessage($user, $planName, $endsAt, int $days, $amount): string
    {
        Carbon::setLocale('id');
        $nama = $user->name ?? 'Owner';
        $sapaan = $user->sapaan ?? '';
        $fullName = trim($sapaan . ' ' . $nama);

        // Different messages based on days
        if ($days < 0) {
            // Before expiry
            $daysRemaining = abs($days);
            $urgency = '';
            
            if ($daysRemaining == 7) {
                $urgency = "⚠️ *Pengingat 7 Hari:* Paket Anda akan berakhir dalam 7 hari lagi.\n\n";
            } elseif ($daysRemaining == 3) {
                $urgency = "🚨 *Penting!* Paket Anda akan berakhir dalam 3 hari lagi!\n\n";
            } elseif ($daysRemaining == 1) {
                $urgency = "🚨🚨 *SANGAT MENDESAK!* Paket Anda akan berakhir BESOK!\n\n";
            } elseif ($daysRemaining == 0) {
                $urgency = "🚨🚨🚨 *HARI TERAKHIR!* Paket Anda akan berakhir HARI INI!\n\n";
            }

            $message = "📦 *PENGINGAT PERPANJANGAN PAKET SUBSCRIPTION*\n\n" .
                "Halo *{$fullName}!*\n\n" .
                $urgency .
                "Paket subscription Anda akan segera berakhir.\n\n" .
                "📋 *Detail Paket:*\n" .
                "• Paket: *{$planName}*\n" .
                "• Berakhir: *{$endsAt}*\n" .
                "• Hari Tersisa: *{$daysRemaining} hari*\n" .
                "• Jumlah Terakhir: *Rp {$amount}*\n\n" .
                "💡 *Aksi yang Diperlukan:*\n" .
                "Silakan segera lakukan perpanjangan paket subscription Anda untuk melanjutkan layanan tanpa gangguan.\n\n" .
                "🔗 Login ke dashboard Anda untuk melakukan perpanjangan:\n" .
                url('/') . "\n\n" .
                "Jika Anda memiliki pertanyaan atau membutuhkan bantuan, jangan ragu untuk menghubungi tim support kami.\n\n" .
                "Terima kasih atas kepercayaan Anda! 🙏\n\n" .
                "_Pesan ini dikirim otomatis_";

        } else {
            // After expiry
            $daysExpired = $days;
            
            if ($daysExpired == 1) {
                $urgency = "⚠️ *Paket Anda Sudah Berakhir*\n\n";
                $message = "Paket subscription Anda sudah berakhir kemarin. Layanan Anda saat ini tidak aktif.\n\n";
            } elseif ($daysExpired == 3) {
                $urgency = "🚨 *Paket Sudah Berakhir 3 Hari*\n\n";
                $message = "Paket subscription Anda sudah berakhir 3 hari yang lalu. Layanan Anda saat ini tidak aktif.\n\n";
            } elseif ($daysExpired == 7) {
                $urgency = "🚨🚨 *Paket Sudah Berakhir 7 Hari*\n\n";
                $message = "Paket subscription Anda sudah berakhir 7 hari yang lalu. Layanan Anda saat ini tidak aktif.\n\n";
            }

            $message = "📦 *PAKET SUBSCRIPTION SUDAH BERAKHIR*\n\n" .
                "Halo *{$fullName}!*\n\n" .
                $urgency .
                $message .
                "📋 *Detail Paket:*\n" .
                "• Paket: *{$planName}*\n" .
                "• Berakhir: *{$endsAt}*\n" .
                "• Sudah Berakhir: *{$daysExpired} hari yang lalu*\n" .
                "• Jumlah Terakhir: *Rp {$amount}*\n\n" .
                "💡 *Aksi yang Diperlukan:*\n" .
                "Silakan segera perpanjang paket subscription Anda untuk mengaktifkan kembali layanan.\n\n" .
                "🔗 Login ke dashboard Anda untuk melakukan perpanjangan:\n" .
                url('/') . "\n\n" .
                "Jika Anda memiliki pertanyaan atau membutuhkan bantuan, jangan ragu untuk menghubungi tim support kami.\n\n" .
                "Terima kasih atas kepercayaan Anda! 🙏\n\n" .
                "_Pesan ini dikirim otomatis_";
        }

        return $message;
    }
}
