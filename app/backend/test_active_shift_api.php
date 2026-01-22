<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;

echo "TEST ACTIVE SHIFT API FOR USER 22\n";
echo "===================================\n\n";

$userId = 22;
$businessId = 1;
$outletId = 1;

echo "Searching for active shift:\n";
echo "  User ID: $userId\n";
echo "  Business ID: $businessId\n";
echo "  Outlet ID: $outletId\n\n";

$activeShift = CashierShift::open()
    ->forUser($userId)
    ->forBusiness($businessId)
    ->forOutlet($outletId)
    ->with(['user', 'outlet'])
    ->first();

if (!$activeShift) {
    echo "❌ NO ACTIVE SHIFT FOUND\n";
    echo "\nAPI should return:\n";
    echo json_encode([
        'success' => false,
        'has_active_shift' => false,
        'message' => 'No active shift found'
    ], JSON_PRETTY_PRINT);
    echo "\n\n";
} else {
    echo "✅ ACTIVE SHIFT FOUND\n";
    echo "Shift ID: {$activeShift->id}\n";
    echo "Shift Name: {$activeShift->shift_name}\n";
    echo "Opening Balance: Rp " . number_format((float)($activeShift->opening_balance ?? 0), 0, ',', '.') . "\n";
    echo "Opened At: {$activeShift->opened_at}\n";
    echo "\nAPI would return:\n";
    echo json_encode([
        'success' => true,
        'has_active_shift' => true,
        'data' => [
            'id' => $activeShift->id,
            'shift_name' => $activeShift->shift_name,
            'opening_balance' => $activeShift->opening_balance,
            'user_id' => $activeShift->user_id,
            'outlet_id' => $activeShift->outlet_id,
        ]
    ], JSON_PRETTY_PRINT);
    echo "\n\n";
}

// Check all open shifts regardless of user
echo "All open shifts in outlet 1:\n";
$allOpen = CashierShift::open()
    ->forBusiness($businessId)
    ->forOutlet($outletId)
    ->with('user')
    ->get();

echo "Found: {$allOpen->count()} open shifts\n\n";
foreach ($allOpen as $shift) {
    echo "  - Shift ID {$shift->id}: User {$shift->user->name} (ID: {$shift->user_id})\n";
}







