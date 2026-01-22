<?php
/**
 * Debug script untuk memeriksa getActiveShift berdasarkan user yang login
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "🔍 Debug Active Shift per User\n";
echo "==============================\n\n";

// 1. Cek semua user dan shift aktif mereka
echo "1. 👥 User dan Shift Aktif mereka:\n";
$users = User::all();

foreach ($users as $user) {
    echo "   User ID: {$user->id}, Name: {$user->name}, Email: {$user->email}\n";
    
    // Simulasi getActiveShift untuk user ini
    $activeShift = CashierShift::open()
        ->where('user_id', $user->id)
        ->where('business_id', 1)
        ->where('outlet_id', 1)
        ->with(['user', 'outlet'])
        ->first();
    
    if ($activeShift) {
        echo "     ✅ Active Shift: ID {$activeShift->id}, Nama: {$activeShift->shift_name}\n";
        echo "       Opening: {$activeShift->opening_balance}, Expected: {$activeShift->expected_cash}\n";
        echo "       Total Trans: {$activeShift->total_transactions}, Orders: " . $activeShift->orders()->count() . "\n";
    } else {
        echo "     ❌ No active shift\n";
    }
    echo "\n";
}

// 2. Cek shift ID 49 secara khusus
echo "2. 🔍 Shift ID 49 (yang seharusnya aktif untuk Juli):\n";
$shift49 = CashierShift::find(49);
if ($shift49) {
    echo "   - ID: {$shift49->id}\n";
    echo "   - Nama: {$shift49->shift_name}\n";
    echo "   - Status: {$shift49->status}\n";
    echo "   - User ID: {$shift49->user_id}\n";
    echo "   - Business ID: {$shift49->business_id}\n";
    echo "   - Outlet ID: {$shift49->outlet_id}\n";
    echo "   - Opening Balance: {$shift49->opening_balance}\n";
    echo "   - Expected Cash: {$shift49->expected_cash}\n";
    echo "   - Total Transactions: {$shift49->total_transactions}\n";
    
    // Cek apakah shift ini akan ditemukan oleh getActiveShift
    $user = User::find($shift49->user_id);
    if ($user) {
        echo "   - User: {$user->name} ({$user->email})\n";
        
        // Test getActiveShift untuk user ini
        $testActiveShift = CashierShift::open()
            ->where('user_id', $shift49->user_id)
            ->where('business_id', $shift49->business_id)
            ->where('outlet_id', $shift49->outlet_id)
            ->with(['user', 'outlet'])
            ->first();
        
        if ($testActiveShift && $testActiveShift->id == 49) {
            echo "   ✅ Shift ID 49 akan ditemukan oleh getActiveShift untuk user {$user->name}\n";
        } else {
            echo "   ❌ Shift ID 49 TIDAK akan ditemukan oleh getActiveShift untuk user {$user->name}\n";
            if ($testActiveShift) {
                echo "     Sebaliknya ditemukan Shift ID: {$testActiveShift->id}\n";
            }
        }
    }
} else {
    echo "   ❌ Shift ID 49 tidak ditemukan!\n";
}

// 3. Cek shift yang akan ditemukan untuk user ID 1 (Owner)
echo "\n3. 🔍 Shift yang akan ditemukan untuk User ID 1 (Owner):\n";
$ownerActiveShift = CashierShift::open()
    ->where('user_id', 1)
    ->where('business_id', 1)
    ->where('outlet_id', 1)
    ->with(['user', 'outlet'])
    ->first();

if ($ownerActiveShift) {
    echo "   - ID: {$ownerActiveShift->id}\n";
    echo "   - Nama: {$ownerActiveShift->shift_name}\n";
    echo "   - Status: {$ownerActiveShift->status}\n";
    echo "   - Opening Balance: {$ownerActiveShift->opening_balance}\n";
    echo "   - Expected Cash: {$ownerActiveShift->expected_cash}\n";
    echo "   - Total Transactions: {$ownerActiveShift->total_transactions}\n";
} else {
    echo "   ❌ No active shift found for User ID 1\n";
}

echo "\n✅ Debug selesai!\n";
?>


























































