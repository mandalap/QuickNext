<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\Employee;
use App\Models\User;
use App\Models\Business;
use App\Models\Outlet;
use Illuminate\Support\Facades\DB;

echo "=== OPENING SHIFT FOR WAITER ===\n\n";

try {
    // Find waiter user
    $waiter = User::where('email', 'waiter@test.com')->first();
    if (!$waiter) {
        echo "❌ Waiter user not found\n";
        exit(1);
    }
    echo "✅ Found waiter user: {$waiter->name} ({$waiter->email})\n";

    // Find business
    $business = Business::first();
    if (!$business) {
        echo "❌ No business found\n";
        exit(1);
    }
    echo "✅ Found business: {$business->name}\n";

    // Find outlet
    $outlet = Outlet::where('business_id', $business->id)->first();
    if (!$outlet) {
        echo "❌ No outlet found\n";
        exit(1);
    }
    echo "✅ Found outlet: {$outlet->name}\n";

    // Find employee record
    $employee = Employee::where('user_id', $waiter->id)
        ->where('business_id', $business->id)
        ->first();

    if (!$employee) {
        echo "❌ No employee record found for waiter\n";
        exit(1);
    }
    echo "✅ Found employee record: {$employee->name}\n";

    // Check if shift already exists
    $existingShift = CashierShift::where('user_id', $waiter->id)
        ->where('outlet_id', $outlet->id)
        ->where('status', 'open')
        ->first();

    if ($existingShift) {
        echo "⚠️  Waiter already has an open shift: {$existingShift->shift_name}\n";
        echo "   Shift ID: {$existingShift->id}\n";
        echo "   Opened at: {$existingShift->opened_at}\n";
        exit(0);
    }

    // Create new shift
    DB::beginTransaction();

    $shift = CashierShift::create([
        'business_id' => $business->id,
        'outlet_id' => $outlet->id,
        'user_id' => $waiter->id,
        'employee_id' => $employee->id,
        'shift_name' => 'Waiter Shift - ' . now()->format('d M Y H:i'),
        'opened_at' => now(),
        'opening_balance' => 0,
        'opening_notes' => 'Auto-opened for waiter testing',
        'status' => 'open',
    ]);

    DB::commit();

    echo "✅ Shift opened successfully!\n";
    echo "   Shift ID: {$shift->id}\n";
    echo "   Shift Name: {$shift->shift_name}\n";
    echo "   Opened at: {$shift->opened_at}\n";
    echo "   Status: {$shift->status}\n";

    echo "\n🎉 Waiter can now create orders!\n";

} catch (Exception $e) {
    DB::rollback();
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}












































































