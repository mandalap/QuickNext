<?php

echo "\n";
echo "============================================\n";
echo "  VERIFY ALL PAYMENT FIXES\n";
echo "============================================\n\n";

$errors = [];
$warnings = [];
$success = [];

// Check 1: Middleware allows business creation
echo "1. Checking CheckSubscriptionStatus middleware...\n";
$middlewareFile = __DIR__ . '/app/Http/Middleware/CheckSubscriptionStatus.php';
$middlewareContent = file_get_contents($middlewareFile);

if (strpos($middlewareContent, 'Business creation is exempt from subscription check') !== false) {
    $success[] = "✅ Middleware allows business creation";
} else {
    $errors[] = "❌ Middleware missing business creation exempt";
}

if (strpos($middlewareContent, "request->is('api/v1/businesses/current')") !== false) {
    $success[] = "✅ Middleware allows GET /businesses/current";
} else {
    $errors[] = "❌ Middleware missing /businesses/current exempt";
}

// Check 2: BusinessController auto-activates pending
echo "2. Checking BusinessController auto-activation...\n";
$businessControllerFile = __DIR__ . '/app/Http/Controllers/Api/BusinessController.php';
$businessControllerContent = file_get_contents($businessControllerFile);

if (strpos($businessControllerContent, 'Check for pending_payment subscription') !== false) {
    $success[] = "✅ BusinessController has auto-activate logic";
} else {
    $errors[] = "❌ BusinessController missing auto-activate logic";
}

if (strpos($businessControllerContent, 'Auto-activated on business creation') !== false) {
    $success[] = "✅ BusinessController creates payment record on auto-activate";
} else {
    $errors[] = "❌ BusinessController missing payment record creation";
}

if (strpos($businessControllerContent, '$subscription->ends_at') !== false) {
    $success[] = "✅ BusinessController uses subscription end date";
} else {
    $warnings[] = "⚠️ BusinessController might use hardcoded date";
}

// Check 3: PaymentController column names
echo "3. Checking PaymentController column names...\n";
$paymentControllerFile = __DIR__ . '/app/Http/Controllers/Api/PaymentController.php';
$paymentControllerContent = file_get_contents($paymentControllerFile);

if (strpos($paymentControllerContent, "'payment_code'") !== false &&
    strpos($paymentControllerContent, "'gateway_payment_id'") !== false) {
    $success[] = "✅ PaymentController uses correct column names";
} else {
    $errors[] = "❌ PaymentController still using old column names";
}

// Check 4: SubscriptionController verify endpoint
echo "4. Checking SubscriptionController verify endpoint...\n";
$subscriptionControllerFile = __DIR__ . '/app/Http/Controllers/Api/SubscriptionController.php';
$subscriptionControllerContent = file_get_contents($subscriptionControllerFile);

if (strpos($subscriptionControllerContent, 'verifyAndActivatePending') !== false) {
    $success[] = "✅ SubscriptionController has verify endpoint";
} else {
    $warnings[] = "⚠️ SubscriptionController missing verify endpoint";
}

// Check 5: Routes
echo "5. Checking API routes...\n";
$routesFile = __DIR__ . '/routes/api.php';
$routesContent = file_get_contents($routesFile);

if (strpos($routesContent, 'verify-activate') !== false) {
    $success[] = "✅ Routes has verify-activate endpoint";
} else {
    $warnings[] = "⚠️ Routes missing verify-activate endpoint";
}

// Output results
echo "\n";
echo "============================================\n";
echo "  RESULTS\n";
echo "============================================\n\n";

if (!empty($success)) {
    echo "✅ SUCCESSES (" . count($success) . "):\n";
    foreach ($success as $s) {
        echo "   {$s}\n";
    }
    echo "\n";
}

if (!empty($warnings)) {
    echo "⚠️  WARNINGS (" . count($warnings) . "):\n";
    foreach ($warnings as $w) {
        echo "   {$w}\n";
    }
    echo "\n";
}

if (!empty($errors)) {
    echo "❌ ERRORS (" . count($errors) . "):\n";
    foreach ($errors as $e) {
        echo "   {$e}\n";
    }
    echo "\n";
    echo "⚠️  PLEASE FIX ERRORS BEFORE TESTING!\n\n";
    exit(1);
}

echo "============================================\n";
echo "  ALL CHECKS PASSED! ✅\n";
echo "============================================\n\n";

echo "Next steps:\n";
echo "1. ✅ Clear browser cache\n";
echo "2. ✅ Restart backend server (if using php artisan serve)\n";
echo "3. ✅ Restart frontend development server\n";
echo "4. ✅ Test complete flow:\n";
echo "     - Register new user\n";
echo "     - Subscribe to plan\n";
echo "     - Pay via Midtrans\n";
echo "     - Create business\n";
echo "     - Access dashboard\n";
echo "\n";
