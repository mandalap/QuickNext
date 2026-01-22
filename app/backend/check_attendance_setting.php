<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Business;
use Illuminate\Support\Facades\Log;

echo "🔍 Memeriksa setting require_attendance_for_pos...\n\n";

$businesses = Business::all();

if ($businesses->isEmpty()) {
    echo "❌ Tidak ada business ditemukan.\n";
    exit(1);
}

foreach ($businesses as $business) {
    echo "📦 Business: {$business->name} (ID: {$business->id})\n";
    echo "   Settings: " . json_encode($business->settings, JSON_PRETTY_PRINT) . "\n";
    
    $settings = $business->settings ?? [];
    $requireAttendance = $settings['require_attendance_for_pos'] ?? false;
    $requireAttendanceBool = filter_var($requireAttendance, FILTER_VALIDATE_BOOLEAN);
    
    echo "   require_attendance_for_pos (raw): " . var_export($requireAttendance, true) . "\n";
    echo "   require_attendance_for_pos (bool): " . var_export($requireAttendanceBool, true) . "\n";
    echo "   Type: " . gettype($requireAttendance) . "\n";
    
    if ($requireAttendanceBool === true) {
        echo "   ✅ Setting aktif - validasi absensi akan dijalankan\n";
    } else {
        echo "   ⚠️  Setting tidak aktif - validasi absensi tidak akan dijalankan\n";
    }
    
    echo "\n";
}

echo "💡 Tips:\n";
echo "   1. Pastikan setting disimpan sebagai boolean true (bukan string 'true')\n";
echo "   2. Cek log backend saat buka shift untuk melihat nilai setting\n";
echo "   3. Jika setting tidak aktif, aktifkan di halaman Business Management\n";
