<?php
/**
 * Script to manually activate pending subscriptions
 * Use this when Midtrans webhook failed but payment is actually successful
 *
 * Run with: php activate_pending_subscriptions.php
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "\n";
echo "============================================\n";
echo "  ACTIVATE PENDING SUBSCRIPTIONS\n";
echo "============================================\n\n";

// Get all pending subscriptions
$pendingSubscriptions = DB::table('user_subscriptions')
    ->join('users', 'user_subscriptions.user_id', '=', 'users.id')
    ->join('subscription_plans', 'user_subscriptions.subscription_plan_id', '=', 'subscription_plans.id')
    ->where('user_subscriptions.status', 'pending_payment')
    ->select(
        'user_subscriptions.id',
        'user_subscriptions.subscription_code',
        'user_subscriptions.user_id',
        'users.name as user_name',
        'users.email as user_email',
        'subscription_plans.name as plan_name',
        'user_subscriptions.amount_paid',
        'user_subscriptions.created_at'
    )
    ->orderBy('user_subscriptions.created_at', 'desc')
    ->get();

if ($pendingSubscriptions->isEmpty()) {
    echo "✅ No pending subscriptions found!\n\n";
    exit(0);
}

echo "Found " . count($pendingSubscriptions) . " pending subscription(s):\n\n";

foreach ($pendingSubscriptions as $i => $sub) {
    echo ($i + 1) . ". ID: {$sub->id}\n";
    echo "   Code: {$sub->subscription_code}\n";
    echo "   User: {$sub->user_name} ({$sub->user_email})\n";
    echo "   Plan: {$sub->plan_name}\n";
    echo "   Amount: Rp " . number_format($sub->amount_paid, 0, ',', '.') . "\n";
    echo "   Created: {$sub->created_at}\n";
    echo "\n";
}

// Ask for confirmation
echo "Do you want to activate these subscriptions? (yes/no): ";
$handle = fopen("php://stdin", "r");
$line = fgets($handle);
$answer = trim(strtolower($line));

if ($answer !== 'yes' && $answer !== 'y') {
    echo "\n❌ Cancelled. No subscriptions were activated.\n\n";
    exit(0);
}

echo "\n⚙️  Activating subscriptions...\n\n";

$activated = 0;
$failed = 0;

foreach ($pendingSubscriptions as $sub) {
    try {
        DB::beginTransaction();

        // Update subscription to active
        DB::table('user_subscriptions')
            ->where('id', $sub->id)
            ->update([
                'status' => 'active',
                'notes' => DB::raw("CONCAT(COALESCE(notes, ''), ' | Manually activated via script at " . Carbon::now() . "')"),
                'updated_at' => Carbon::now(),
            ]);

        // Create payment record
        DB::table('subscription_payments')->insert([
            'user_subscription_id' => $sub->id,
            'payment_code' => $sub->subscription_code,
            'payment_method' => 'manual_activation',
            'payment_gateway' => 'manual',
            'gateway_payment_id' => $sub->subscription_code,
            'amount' => $sub->amount_paid,
            'status' => 'paid',
            'paid_at' => Carbon::now(),
            'payment_data' => json_encode([
                'note' => 'Manually activated via script',
                'activated_at' => Carbon::now(),
                'reason' => 'Webhook failed but payment confirmed'
            ]),
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        DB::commit();

        echo "✅ Activated: {$sub->subscription_code} ({$sub->user_email})\n";
        $activated++;

    } catch (\Exception $e) {
        DB::rollBack();
        echo "❌ Failed to activate {$sub->subscription_code}: {$e->getMessage()}\n";
        $failed++;
    }
}

echo "\n";
echo "============================================\n";
echo "  ACTIVATION COMPLETE\n";
echo "============================================\n";
echo "✅ Successfully activated: {$activated}\n";
echo "❌ Failed: {$failed}\n";
echo "\n";
echo "Next steps:\n";
echo "1. Users should now be able to create their business\n";
echo "2. Verify payment status in Midtrans dashboard\n";
echo "3. Check webhook configuration if issue persists\n";
echo "\n";
