<?php
/**
 * Test script untuk memeriksa authentication context
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "🔍 Test Authentication Context\n";
echo "=============================\n\n";

// 1. Cek semua user dan token mereka
echo "1. 👥 User dan Token:\n";
$users = User::all();
foreach ($users as $user) {
    echo "   User ID: {$user->id}, Name: {$user->name}, Email: {$user->email}\n";
    
    // Cek apakah user ini memiliki token
    $tokens = DB::table('personal_access_tokens')
        ->where('tokenable_id', $user->id)
        ->where('tokenable_type', 'App\\Models\\User')
        ->get();
    
    if ($tokens->count() > 0) {
        echo "     ✅ Has {$tokens->count()} token(s)\n";
        foreach ($tokens as $token) {
            echo "       - Token ID: {$token->id}, Name: {$token->name}\n";
            echo "         Created: {$token->created_at}, Last Used: {$token->last_used_at}\n";
        }
    } else {
        echo "     ❌ No tokens found\n";
    }
    echo "\n";
}

// 2. Cek shift aktif untuk setiap user dengan business_id dan outlet_id yang benar
echo "2. 🔄 Shift Aktif per User (dengan business_id=1, outlet_id=1):\n";
foreach ($users as $user) {
    echo "   User ID: {$user->id}, Name: {$user->name}\n";
    
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
        
        // Test getActiveShift API response
        $apiResponse = [
            'success' => true,
            'has_active_shift' => true,
            'data' => $activeShift
        ];
        echo "       API Response: " . json_encode($apiResponse, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "     ❌ No active shift\n";
    }
    echo "\n";
}

// 3. Cek shift ID 49 secara khusus
echo "3. 🔍 Shift ID 49 (yang seharusnya aktif untuk Juli):\n";
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
    
    // Cek user yang memiliki shift ini
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
            
            // Simulasi API response
            $apiResponse = [
                'success' => true,
                'has_active_shift' => true,
                'data' => $testActiveShift
            ];
            echo "   📊 API Response:\n";
            echo json_encode($apiResponse, JSON_PRETTY_PRINT) . "\n";
        } else {
            echo "   ❌ Shift ID 49 TIDAK akan ditemukan oleh getActiveShift untuk user {$user->name}\n";
        }
    }
} else {
    echo "   ❌ Shift ID 49 tidak ditemukan!\n";
}

echo "\n✅ Test selesai!\n";
?>


























































