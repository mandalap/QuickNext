<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pengingat Subscription</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Pengingat Subscription</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Halo <strong>{{ $user->name }}</strong>,</p>
        
        <p>Kami ingin mengingatkan Anda bahwa paket subscription Anda akan segera berakhir:</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0;"><strong>Paket:</strong> {{ $planName }}</p>
            <p style="margin: 10px 0 0 0;"><strong>Berakhir Pada:</strong> {{ $endsAt }}</p>
            <p style="margin: 10px 0 0 0;"><strong>Hari Tersisa:</strong> <span style="color: #e74c3c; font-weight: bold;">{{ number_format($daysRemaining, 0) }} hari</span></p>
        </div>
        
        @if($daysRemaining <= 7)
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>⚠️ PENTING:</strong> Subscription Anda akan berakhir dalam waktu dekat. Silakan perpanjang segera untuk menghindari gangguan layanan.</p>
            </div>
        @elseif($daysRemaining <= 14)
            <div style="background: #d1ecf1; border: 1px solid #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #0c5460;"><strong>ℹ️ INFORMASI:</strong> Subscription Anda akan berakhir dalam waktu dekat. Pertimbangkan untuk memperpanjang subscription Anda.</p>
            </div>
        @endif
        
        <p>Untuk memperpanjang subscription Anda, silakan login ke akun Anda dan pilih paket yang sesuai.</p>
        
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

