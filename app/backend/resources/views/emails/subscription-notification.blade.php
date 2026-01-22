<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notifikasi Subscription</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">
            @if($type === 'created')
                📦 Paket Subscription Dibuat
            @else
                ✅ Pembayaran Berhasil
            @endif
        </h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Halo <strong>{{ $user->name }}</strong>,</p>
        
        @if($type === 'created')
            <p>Paket subscription Anda telah berhasil dibuat. Berikut detail paket Anda:</p>
        @else
            <p>Pembayaran untuk paket subscription Anda telah berhasil dikonfirmasi. Paket Anda sekarang aktif!</p>
        @endif
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">Detail Paket</h3>
            <p style="margin: 5px 0;"><strong>Kode Subscription:</strong> {{ $subscription->subscription_code }}</p>
            <p style="margin: 5px 0;"><strong>Nama Paket:</strong> {{ $subscription->subscriptionPlan->name }}</p>
            <p style="margin: 5px 0;"><strong>Durasi:</strong> {{ $subscription->subscriptionPlanPrice->duration_months ?? 1 }} bulan</p>
            <p style="margin: 5px 0;"><strong>Mulai:</strong> {{ \Carbon\Carbon::parse($subscription->starts_at)->locale('id')->translatedFormat('d F Y') }}</p>
            <p style="margin: 5px 0;"><strong>Berakhir:</strong> {{ \Carbon\Carbon::parse($subscription->ends_at)->locale('id')->translatedFormat('d F Y') }}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> 
                @if($subscription->is_trial)
                    <span style="color: #e74c3c; font-weight: bold;">GRATIS 🎉</span>
                @else
                    <span style="color: #27ae60; font-weight: bold;">Rp {{ number_format($subscription->amount_paid, 0, ',', '.') }}</span>
                @endif
            </p>
            @if($type === 'paid' && $payment)
                <p style="margin: 5px 0;"><strong>Waktu Pembayaran:</strong> {{ \Carbon\Carbon::parse($payment->paid_at)->locale('id')->translatedFormat('d F Y H:i') }} WIB</p>
                <p style="margin: 5px 0;"><strong>Metode Pembayaran:</strong> {{ ucfirst(str_replace('_', ' ', $payment->payment_method)) }}</p>
            @endif
        </div>

        @if($type === 'created' && !$subscription->is_trial)
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                    <strong>💳 PENTING:</strong> Silakan lakukan pembayaran untuk mengaktifkan paket subscription Anda. Setelah pembayaran dikonfirmasi, paket Anda akan langsung aktif.
                </p>
            </div>
        @elseif($type === 'paid')
            <div style="background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                    <strong>🎉 SELAMAT!</strong> Paket subscription Anda sekarang aktif. Anda dapat menggunakan semua fitur sesuai dengan paket yang Anda pilih.
                </p>
            </div>
        @endif

        @if($subscription->is_trial)
            <div style="background: #d1ecf1; border: 1px solid #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #0c5460;">
                    <strong>🎊 PAKET TRIAL:</strong> Ini adalah paket trial gratis untuk Anda. Nikmati semua fitur selama periode trial!
                </p>
            </div>
        @endif
        
        <p>Untuk melihat detail subscription Anda, silakan login ke dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ url('/') }}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Login ke Dashboard</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Jika Anda memiliki pertanyaan atau membutuhkan bantuan, silakan hubungi tim support kami.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Email ini dikirim secara otomatis. Mohon jangan membalas email ini.
        </p>
    </div>
</body>
</html>

