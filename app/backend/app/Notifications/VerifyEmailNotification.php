<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // Build verification URL - pointing to frontend with signed route
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $signedUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addDays(7),
            ['id' => $notifiable->id, 'hash' => sha1($notifiable->email)]
        );

        // Extract the signed URL path and query string
        $urlParts = parse_url($signedUrl);
        $verificationUrl = $frontendUrl . '/email/verify?' . ($urlParts['query'] ?? 'id=' . $notifiable->id . '&hash=' . sha1($notifiable->email));

        return (new MailMessage)
            ->subject('Verifikasi Email Anda')
            ->greeting('Halo ' . $notifiable->name . '!')
            ->line('Terima kasih telah mendaftar di sistem POS kami.')
            ->line('Silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda:')
            ->action('Verifikasi Email', $verificationUrl)
            ->line('Link verifikasi akan kadaluarsa dalam 7 hari.')
            ->line('Jika Anda tidak membuat akun ini, abaikan email ini.')
            ->salutation('Salam, Tim POS System');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}

