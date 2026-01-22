<?php

require_once 'vendor/autoload.php';

use Carbon\Carbon;

// Test downgrade functionality
function testDowngrade() {
    echo "🔄 TESTING DOWNGRADE FUNCTIONALITY\n";
    echo "==================================\n\n";

    // Simulate current subscription (Professional)
    $currentPlan = 'Professional';
    $currentAmountPaid = 50000; // Rp 50,000
    $currentStartsAt = Carbon::now()->subDays(5);
    $currentEndsAt = Carbon::now()->addDays(25);

    echo "📊 CURRENT SUBSCRIPTION:\n";
    echo "  Plan: " . $currentPlan . "\n";
    echo "  Amount Paid: Rp " . number_format($currentAmountPaid) . "\n";
    echo "  Started: " . $currentStartsAt->format('Y-m-d H:i:s') . "\n";
    echo "  Ends: " . $currentEndsAt->format('Y-m-d H:i:s') . "\n";
    echo "  Days Used: " . $currentStartsAt->diffInDays(Carbon::now()) . "\n";
    echo "  Days Remaining: " . Carbon::now()->diffInDays($currentEndsAt) . "\n\n";

    // Trial plan details
    $trialPlan = 'Trial 7 Hari';
    $trialAmount = 0; // Free
    $trialDuration = 7; // 7 days
    $newTrialEndsAt = Carbon::now()->addDays($trialDuration);

    echo "📊 NEW TRIAL SUBSCRIPTION:\n";
    echo "  Plan: " . $trialPlan . "\n";
    echo "  Amount: Rp " . number_format($trialAmount) . " (FREE)\n";
    echo "  Duration: " . $trialDuration . " days\n";
    echo "  Ends: " . $newTrialEndsAt->format('Y-m-d H:i:s') . "\n\n";

    // Calculate what happens
    $remainingDays = Carbon::now()->diffInDays($currentEndsAt);
    $usedDays = $currentStartsAt->diffInDays(Carbon::now());
    $totalDays = $currentStartsAt->diffInDays($currentEndsAt);

    echo "💰 FINANCIAL IMPACT:\n";
    echo "  Original Investment: Rp " . number_format($currentAmountPaid) . "\n";
    echo "  Days Used: " . $usedDays . " / " . $totalDays . " (" . round(($usedDays / $totalDays) * 100, 1) . "%)\n";
    echo "  Days Remaining: " . $remainingDays . " (" . round(($remainingDays / $totalDays) * 100, 1) . "%)\n";
    echo "  Value Lost: Rp " . number_format(($remainingDays / $totalDays) * $currentAmountPaid) . "\n";
    echo "  New Trial Cost: Rp " . number_format($trialAmount) . "\n";
    echo "  Net Savings: Rp " . number_format($trialAmount - (($remainingDays / $totalDays) * $currentAmountPaid)) . "\n\n";

    // Trial limitations
    echo "🔒 TRIAL LIMITATIONS:\n";
    echo "  • Maksimal 1 outlet (vs Unlimited)\n";
    echo "  • Maksimal 10 produk (vs Unlimited)\n";
    echo "  • Maksimal 50 transaksi per bulan (vs Unlimited)\n";
    echo "  • Support email only (vs Priority support)\n";
    echo "  • No custom branding\n";
    echo "  • Limited data export\n";
    echo "  • Duration: 7 days only\n\n";

    // Benefits of downgrade
    echo "✅ BENEFITS OF DOWNGRADE:\n";
    echo "  • No monthly payment required\n";
    echo "  • Access to basic features\n";
    echo "  • Data remains safe and accessible\n";
    echo "  • Can upgrade again anytime\n";
    echo "  • Good for testing or temporary use\n\n";

    // Process steps
    echo "🔄 DOWNGRADE PROCESS:\n";
    echo "  1. User clicks 'Downgrade ke Trial'\n";
    echo "  2. Confirmation modal appears\n";
    echo "  3. User types 'downgrade' to confirm\n";
    echo "  4. Current subscription cancelled\n";
    echo "  5. New trial subscription created\n";
    echo "  6. Business subscription info updated\n";
    echo "  7. User redirected to updated dashboard\n\n";

    // API endpoint
    echo "🌐 API ENDPOINT:\n";
    echo "  POST /v1/subscriptions/downgrade-to-trial\n";
    echo "  Headers: Authorization: Bearer {token}\n";
    echo "  Body: {} (empty)\n\n";

    // Response example
    echo "📤 EXPECTED RESPONSE:\n";
    echo "  {\n";
    echo "    \"success\": true,\n";
    echo "    \"message\": \"Berhasil downgrade ke paket trial 7 hari\",\n";
    echo "    \"data\": {\n";
    echo "      \"subscription\": { ... },\n";
    echo "      \"trial_ends_at\": \"" . $newTrialEndsAt->toISOString() . "\",\n";
    echo "      \"features\": [ ... ]\n";
    echo "    }\n";
    echo "  }\n\n";

    echo "✅ DOWNGRADE TEST COMPLETED!\n";
    echo "============================\n";
}

// Run the test
testDowngrade();

?>












































































