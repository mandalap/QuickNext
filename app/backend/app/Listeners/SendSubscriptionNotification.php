<?php

namespace App\Listeners;

use App\Events\SubscriptionCreated;
use App\Events\SubscriptionPaid;
use App\Models\Notification;
use App\Services\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class SendSubscriptionNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle SubscriptionCreated event
     */
    public function handleCreated(SubscriptionCreated $event)
    {
        $subscription = $event->subscription;
        $this->sendNotifications($subscription, 'created');
    }

    /**
     * Handle SubscriptionPaid event
     */
    public function handlePaid(SubscriptionPaid $event)
    {
        $payment = $event->payment;
        $subscription = $payment->userSubscription;
        $this->sendNotifications($subscription, 'paid', $payment);
    }

    /**
     * Universal method untuk kirim notifikasi (WhatsApp + Email)
     */
    private function sendNotifications($subscription, $type, $payment = null)
    {
        try {
            $subscription->load(['user', 'subscriptionPlan', 'subscriptionPlanPrice']);
            $user = $subscription->user;

            if (!$user) {
                Log::error("User not found for subscription notification {$type}", [
                    'subscription_id' => $subscription->id
                ]);
                return;
            }

            // 1. Buat notifikasi di database
            $this->createDatabaseNotification($subscription, $type, $payment);

            // 2. Kirim WhatsApp
            $this->sendWhatsApp($subscription, $type, $payment);

            // 3. Kirim Email
            $this->sendEmail($subscription, $type, $payment);

        } catch (\Exception $e) {
            Log::error("Exception saat kirim notifikasi subscription {$type}", [
                'subscription_id' => $subscription->id ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Buat notifikasi di database
     */
    private function createDatabaseNotification($subscription, $type, $payment = null)
    {
        $user = $subscription->user;
        $plan = $subscription->subscriptionPlan;
        
        $title = $type === 'created' 
            ? 'Paket Subscription Dibuat' 
            : 'Pembayaran Subscription Berhasil';

        $message = $type === 'created'
            ? "Paket subscription Anda ({$plan->name}) telah dibuat. Silakan lakukan pembayaran untuk mengaktifkan."
            : "Pembayaran untuk paket subscription Anda ({$plan->name}) telah berhasil dikonfirmasi. Subscription Anda sekarang aktif.";

        Notification::create([
            'business_id' => null,
            'outlet_id' => null,
            'user_id' => $user->id,
            'type' => 'subscription_' . $type,
            'title' => $title,
            'message' => $message,
            'data' => [
                'subscription_id' => $subscription->id,
                'subscription_code' => $subscription->subscription_code,
                'plan_name' => $plan->name,
                'type' => $type,
                'payment_id' => $payment?->id,
            ],
            'is_read' => false,
            'read_at' => null,
        ]);
    }

    /**
     * Kirim WhatsApp
     */
    private function sendWhatsApp($subscription, $type, $payment = null)
    {
        try {
            $user = $subscription->user;
            $plan = $subscription->subscriptionPlan;
            $price = $subscription->subscriptionPlanPrice;

            if (!$user->phone) {
                Log::info("No phone number for WhatsApp notification", [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id
                ]);
                return;
            }

            // Build WhatsApp message
            $message = $this->buildWhatsAppMessage($subscription, $type, $payment);

            // Try to use WhatsAppService if available (with null outlet = global config)
            if (class_exists(WhatsAppService::class)) {
                try {
                    $whatsappService = new WhatsAppService(null); // null = use global config
                    $result = $whatsappService->sendMessage($user->phone, $message);
                    
                    if (isset($result['success']) && $result['success']) {
                        Log::info("WhatsApp subscription notification sent via WhatsAppService", [
                            'subscription_id' => $subscription->id,
                            'type' => $type,
                            'phone' => $user->phone
                        ]);
                        return;
                    }
                } catch (\Exception $e) {
                    Log::warning("WhatsAppService failed, trying direct API", [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Fallback: Direct API call (similar to SendWhatsAppTransaction)
            $this->sendWhatsAppDirect($user->phone, $message);

        } catch (\Exception $e) {
            Log::error("Failed to send WhatsApp subscription notification", [
                'subscription_id' => $subscription->id,
                'type' => $type,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Send WhatsApp via direct API
     */
    private function sendWhatsAppDirect($phone, $message)
    {
        // Check if WhatsappApiToken model exists
        if (!class_exists(\App\Models\WhatsappApiToken::class)) {
            Log::warning("WhatsappApiToken model not found, skipping WhatsApp");
            return;
        }

        $token = \App\Models\WhatsappApiToken::where('status', 'active')->first();

        if (!$token) {
            Log::warning("No active WhatsApp token found");
            return;
        }

        $formattedPhone = $this->formatPhoneNumber($phone);

        $data = [
            'api_key' => $token->api_token,
            'sender' => $token->sender,
            'number' => $formattedPhone,
            'message' => $message,
        ];

        $response = $this->sendCurl($token->url, $data);
        $this->logWhatsAppResponse($response, $phone);
    }

    /**
     * Build WhatsApp message
     */
    private function buildWhatsAppMessage($subscription, $type, $payment = null)
    {
        Carbon::setLocale('id');
        $user = $subscription->user;
        $plan = $subscription->subscriptionPlan;
        $price = $subscription->subscriptionPlanPrice;
        
        $nama = $user->name ?? 'Pengguna';
        $invoice = $subscription->subscription_code;
        $planName = $plan->name;
        $amount = number_format($subscription->amount_paid, 0, ',', '.');
        $duration = $price->duration_months ?? 1;
        $startsAt = Carbon::parse($subscription->starts_at)->translatedFormat('d F Y');
        $endsAt = Carbon::parse($subscription->ends_at)->translatedFormat('d F Y');
        $isTrial = $subscription->is_trial;

        if ($type === 'created') {
            $tanggal = Carbon::parse($subscription->created_at)
                ->setTimezone('Asia/Jakarta')
                ->translatedFormat('l, d F Y H:i');

            $priceInfo = $isTrial ? "*GRATIS* 🎉" : "*Rp {$amount}*";

            $message = "📦 *PAKET SUBSCRIPTION DIBUAT*\n\n" .
                "Halo *{$nama}!*\n\n" .
                "Paket subscription Anda telah berhasil dibuat.\n\n" .
                "📋 *Detail Paket:*\n" .
                "• Kode: *{$invoice}*\n" .
                "• Paket: *{$planName}*\n" .
                "• Durasi: *{$duration} bulan*\n" .
                "• Mulai: *{$startsAt}*\n" .
                "• Berakhir: *{$endsAt}*\n" .
                "• Total: {$priceInfo}\n" .
                "• Waktu: *{$tanggal} WIB*\n\n";

            if ($isTrial) {
                $message .= "🎊 *Selamat! Ini adalah paket trial gratis untuk Anda!*\n\n";
            } else {
                $message .= "💳 *Silakan lakukan pembayaran untuk mengaktifkan paket Anda.*\n\n";
            }

            $message .= "Terima kasih telah memilih layanan kami! 🙏\n\n" .
                "_Pesan ini dikirim otomatis_";

        } else { // paid
            $paidTime = Carbon::parse($payment->paid_at ?? now())
                ->setTimezone('Asia/Jakarta')
                ->translatedFormat('l, d F Y H:i');

            $priceInfo = $isTrial ? "*GRATIS* 🎉" : "*Rp {$amount}*";

            $message = "✅ *PEMBAYARAN SUBSCRIPTION BERHASIL*\n\n" .
                "Halo *{$nama}!*\n\n" .
                "Pembayaran untuk paket subscription Anda telah berhasil dikonfirmasi.\n\n" .
                "📋 *Detail Paket:*\n" .
                "• Kode: *{$invoice}*\n" .
                "• Paket: *{$planName}*\n" .
                "• Durasi: *{$duration} bulan*\n" .
                "• Mulai: *{$startsAt}*\n" .
                "• Berakhir: *{$endsAt}*\n" .
                "• Total Dibayar: {$priceInfo}\n" .
                "• Waktu Pembayaran: *{$paidTime} WIB*\n\n";

            if ($isTrial) {
                $message .= "🎊 *Paket trial Anda telah aktif!*\n\n";
            } else {
                $message .= "🎉 *Paket subscription Anda sekarang AKTIF!*\n\n" .
                    "Anda dapat menggunakan semua fitur sesuai dengan paket yang Anda pilih.\n\n";
            }

            $message .= "Terima kasih atas kepercayaan Anda! 🙏\n\n" .
                "_Pesan ini dikirim otomatis_";
        }

        return $message;
    }

    /**
     * Kirim Email
     */
    private function sendEmail($subscription, $type, $payment = null)
    {
        try {
            $user = $subscription->user;

            if (!$user->email) {
                Log::info("No email for subscription notification", [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id
                ]);
                return;
            }

            $subscription->load(['subscriptionPlan', 'subscriptionPlanPrice']);

            Mail::send('emails.subscription-notification', [
                'user' => $user,
                'subscription' => $subscription,
                'payment' => $payment,
                'type' => $type,
            ], function ($message) use ($user, $type) {
                $subject = $type === 'created' 
                    ? 'Paket Subscription Dibuat - Silakan Lakukan Pembayaran'
                    : 'Pembayaran Subscription Berhasil - Paket Anda Aktif';
                    
                $message->to($user->email, $user->name)
                    ->subject($subject);
            });

            Log::info("Email subscription notification sent", [
                'subscription_id' => $subscription->id,
                'type' => $type,
                'email' => $user->email
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to send email subscription notification", [
                'subscription_id' => $subscription->id,
                'type' => $type,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Format nomor telepon ke format internasional
     */
    private function formatPhoneNumber(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }
        return $phone;
    }

    /**
     * Kirim via cURL
     */
    private function sendCurl($url, $data)
    {
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
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

        return [
            'response' => $response,
            'http_code' => $httpCode,
            'error' => $error
        ];
    }

    /**
     * Log WhatsApp response
     */
    private function logWhatsAppResponse($result, $phone)
    {
        if ($result['error']) {
            Log::error("CURL Error saat kirim WhatsApp subscription", [
                'phone' => $phone,
                'error' => $result['error']
            ]);
        } elseif ($result['http_code'] >= 200 && $result['http_code'] < 300) {
            Log::info("WhatsApp subscription notification sent", [
                'phone' => $phone,
                'response' => $result['response']
            ]);
        } else {
            Log::error("WhatsApp API Error subscription", [
                'phone' => $phone,
                'http_code' => $result['http_code'],
                'response' => $result['response']
            ]);
        }
    }
}

