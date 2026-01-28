<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeEmailNotification extends Notification
{
    use Queueable;

    protected $password;
    protected $role;

    /**
     * Create a new notification instance.
     */
    public function __construct($password = null, $role = null)
    {
        $this->password = $password;
        $this->role = $role;
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
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        
        // Jika ada password, berarti user dibuat oleh admin (manual)
        if ($this->password) {
            $message = (new MailMessage)
                ->subject('Selamat Datang - Akun Anda Telah Dibuat')
                ->greeting('Halo ' . $notifiable->name . '!')
                ->line('Akun Anda telah dibuat di sistem POS kami.')
                ->line('**Detail Akun Anda:**')
                ->line('- Email: ' . $notifiable->email)
                ->line('- Role: ' . ($this->role ? ucfirst($this->role) : ucfirst($notifiable->role ?? 'User')))
                ->line('- Password: ' . $this->password)
                ->line('**⚠️ Penting:** Silakan ubah password Anda setelah login pertama kali.')
                ->line('Silakan login menggunakan kredensial di atas untuk mulai menggunakan sistem.')
                ->action('Login ke Sistem', $frontendUrl . '/login')
                ->line('Jika Anda memiliki pertanyaan, silakan hubungi administrator sistem.')
                ->salutation('Salam, Tim QuickKasir POS');
        } else {
            // Welcome email untuk user yang registrasi sendiri
            $message = (new MailMessage)
                ->subject('Selamat Datang di QuickKasir POS!')
                ->greeting('Halo ' . $notifiable->name . '!')
                ->line('Terima kasih telah bergabung dengan QuickKasir POS System!')
                ->line('Akun Anda telah berhasil dibuat. Sekarang Anda dapat:')
                ->line('✅ Mengelola bisnis Anda dengan mudah')
                ->line('✅ Mencatat transaksi penjualan')
                ->line('✅ Mengelola produk dan stok')
                ->line('✅ Melihat laporan penjualan')
                ->line('✅ Dan banyak fitur lainnya!')
                ->line('')
                ->line('**Langkah selanjutnya:**')
                ->line('1. Verifikasi email Anda dengan mengklik link yang telah dikirim')
                ->line('2. Lengkapi profil bisnis Anda')
                ->line('3. Mulai menggunakan sistem POS')
                ->action('Masuk ke Dashboard', $frontendUrl . '/dashboard')
                ->line('Jika Anda memiliki pertanyaan atau butuh bantuan, jangan ragu untuk menghubungi tim support kami.')
                ->salutation('Salam, Tim QuickKasir POS');
        }

        return $message;
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


