<?php

require_once 'vendor/autoload.php';

use Carbon\Carbon;

// Test prorated billing calculation
function testProratedBilling() {
    echo "🧮 TESTING PRORATED BILLING CALCULATION\n";
    echo "=====================================\n\n";

    // Simulate current subscription (Trial 7 Hari - 5 hari tersisa)
    $currentStartsAt = Carbon::now()->subDays(2); // Started 2 days ago
    $currentEndsAt = Carbon::now()->addDays(5);   // 5 days remaining
    $currentAmountPaid = 0; // Trial is free

    // New plan price (Professional - 1 month)
    $newPlanPrice = 50000; // Rp 50,000
    $newDurationMonths = 1;

    $now = Carbon::now();
    $remainingDays = $now->diffInDays($currentEndsAt, false);
    $totalDays = $currentStartsAt->diffInDays($currentEndsAt);
    $usedDays = $totalDays - $remainingDays;

    echo "📊 CURRENT SUBSCRIPTION:\n";
    echo "  Started: " . $currentStartsAt->format('Y-m-d H:i:s') . "\n";
    echo "  Ends: " . $currentEndsAt->format('Y-m-d H:i:s') . "\n";
    echo "  Total Days: " . $totalDays . "\n";
    echo "  Used Days: " . $usedDays . "\n";
    echo "  Remaining Days: " . $remainingDays . "\n";
    echo "  Amount Paid: Rp " . number_format($currentAmountPaid) . "\n\n";

    echo "📊 NEW PLAN:\n";
    echo "  Price: Rp " . number_format($newPlanPrice) . "\n";
    echo "  Duration: " . $newDurationMonths . " month(s)\n\n";

    // Calculate credit amount (proportional to remaining time)
    $creditAmount = 0;
    if ($remainingDays > 0 && $totalDays > 0) {
        $creditAmount = ($remainingDays / $totalDays) * $currentAmountPaid;
    }

    // Calculate new end date (add remaining days to new subscription)
    $newEndsAt = $now->copy()->addMonths($newDurationMonths);
    if ($remainingDays > 0) {
        $newEndsAt->addDays($remainingDays);
    }

    // Option 1: Prorated (with credit)
    $proratedAmount = max(0, $newPlanPrice - $creditAmount);

    // Option 2: Full payment (no credit, but extend duration)
    $fullAmount = $newPlanPrice;

    // Option 3: Discounted upgrade (10% discount)
    $discountAmount = $newPlanPrice * 0.1;
    $discountedAmount = $newPlanPrice - $discountAmount;

    echo "💰 UPGRADE OPTIONS:\n";
    echo "==================\n\n";

    echo "1️⃣ PRORATED (Recommended):\n";
    echo "   Amount to Pay: Rp " . number_format($proratedAmount) . "\n";
    echo "   Credit Applied: Rp " . number_format($creditAmount) . "\n";
    echo "   New End Date: " . $newEndsAt->format('Y-m-d H:i:s') . "\n";
    echo "   Savings: Rp " . number_format($creditAmount) . "\n\n";

    echo "2️⃣ FULL PAYMENT + EXTENSION:\n";
    echo "   Amount to Pay: Rp " . number_format($fullAmount) . "\n";
    echo "   Credit Applied: Rp 0\n";
    echo "   New End Date: " . $newEndsAt->format('Y-m-d H:i:s') . "\n";
    echo "   Savings: Rp 0\n\n";

    echo "3️⃣ DISCOUNTED UPGRADE:\n";
    echo "   Amount to Pay: Rp " . number_format($discountedAmount) . "\n";
    echo "   Credit Applied: Rp 0\n";
    echo "   New End Date: " . $now->copy()->addMonths($newDurationMonths)->format('Y-m-d H:i:s') . "\n";
    echo "   Savings: Rp " . number_format($discountAmount) . "\n\n";

    // Test with paid subscription
    echo "🧪 TESTING WITH PAID SUBSCRIPTION:\n";
    echo "==================================\n\n";

    $paidAmount = 100000; // Rp 100,000 for 1 month
    $paidCreditAmount = ($remainingDays / $totalDays) * $paidAmount;
    $paidProratedAmount = max(0, $newPlanPrice - $paidCreditAmount);

    echo "📊 PAID SUBSCRIPTION SCENARIO:\n";
    echo "  Original Amount Paid: Rp " . number_format($paidAmount) . "\n";
    echo "  Credit Amount: Rp " . number_format($paidCreditAmount) . "\n";
    echo "  Prorated Amount to Pay: Rp " . number_format($paidProratedAmount) . "\n";
    echo "  Total Savings: Rp " . number_format($paidCreditAmount) . "\n\n";

    echo "✅ PRORATED BILLING TEST COMPLETED!\n";
}

// Run the test
testProratedBilling();

?>












































































