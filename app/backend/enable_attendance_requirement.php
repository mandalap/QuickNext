<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Business;
use Illuminate\Support\Facades\DB;

echo "🔧 Mengaktifkan require_attendance_for_pos untuk semua business...\n\n";

$businesses = Business::all();

if ($businesses->isEmpty()) {
    echo "❌ Tidak ada business ditemukan.\n";
    exit(1);
}

foreach ($businesses as $business) {
    echo "📦 Business: {$business->name} (ID: {$business->id})\n";
    
    // Get existing settings
    $settings = $business->settings;
    if ($settings === null || !is_array($settings)) {
        $settings = [];
    }
    
    // Update setting
    $settings['require_attendance_for_pos'] = true;
    
    // Save
    $business->settings = $settings;
    $business->save();
    
    echo "   ✅ Setting diaktifkan: require_attendance_for_pos = true\n";
    echo "   📋 Settings setelah update: " . json_encode($business->fresh()->settings, JSON_PRETTY_PRINT) . "\n\n";
}

echo "✅ Selesai! Semua business sekarang memiliki require_attendance_for_pos = true\n";
echo "💡 Catatan: Kasir sekarang HARUS melakukan absensi sebelum bisa membuka shift\n";
