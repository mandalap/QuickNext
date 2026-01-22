<?php
/**
 * Debug script untuk memeriksa shift aktif berdasarkan user
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "🔍 Debug User Shift\n";
echo "==================\n\n";

// 1. Cek semua user
echo "1. 👥 Semua User:\n";
$users = User::all();
foreach ($users as $user) {
    echo "   - ID: {$user->id}, Name: {$user->name}, Email: {$user->email}, Role: {$user->role}\n";
}

// 2. Cek shift aktif untuk setiap user
echo "\n2. 🔄 Shift Aktif per User:\n";
foreach ($users as $user) {
    $activeShifts = CashierShift::open()
        ->where('user_id', $user->id)
        ->get();

    echo "   User {$user->id} ({$user->name}):\n";
    if ($activeShifts->count() > 0) {
        foreach ($activeShifts as $shift) {
            echo "     - Shift ID: {$shift->id}, Nama: {$shift->shift_name}\n";
            echo "       Opening: {$shift->opening_balance}, Expected: {$shift->expected_cash}\n";
            echo "       Total Trans: {$shift->total_transactions}, Orders: " . $shift->orders()->count() . "\n";
        }
    } else {
        echo "     - Tidak ada shift aktif\n";
    }
    echo "\n";
}

// 3. Cek shift ID 49 secara khusus
echo "3. 🔍 Shift ID 49 (yang terlihat di gambar):\n";
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
    echo "   - Orders Count: " . $shift49->orders()->count() . "\n";

    // Cek user yang memiliki shift ini
    $user = User::find($shift49->user_id);
    if ($user) {
        echo "   - User: {$user->name} ({$user->email})\n";
    }
} else {
    echo "   ❌ Shift ID 49 tidak ditemukan!\n";
}

// 4. Cek shift yang memiliki nama "Shift 20 Oct 2025 21:08"
echo "\n4. 🔍 Shift dengan nama 'Shift 20 Oct 2025 21:08':\n";
$shiftsWithName = CashierShift::where('shift_name', 'Shift 20 Oct 2025 21:08')->get();
foreach ($shiftsWithName as $shift) {
    echo "   - ID: {$shift->id}, Status: {$shift->status}\n";
    echo "     User ID: {$shift->user_id}, Business ID: {$shift->business_id}, Outlet ID: {$shift->outlet_id}\n";
    echo "     Opening: {$shift->opening_balance}, Expected: {$shift->expected_cash}\n";
    echo "     Total Trans: {$shift->total_transactions}, Orders: " . $shift->orders()->count() . "\n";
}

echo "\n✅ Debug selesai!\n";
?>


























































