<?php

/**
 * Test script to verify middleware behavior
 */

echo "\n============================================\n";
echo "  MIDDLEWARE BEHAVIOR TEST\n";
echo "============================================\n\n";

$middlewareFile = __DIR__ . '/app/Http/Middleware/CheckSubscriptionStatus.php';

echo "Reading middleware file: CheckSubscriptionStatus.php\n\n";

$content = file_get_contents($middlewareFile);

// Check for the correct log message
if (strpos($content, 'Business creation is exempt from subscription check') !== false) {
    echo "✅ CORRECT: New middleware code is in place\n";
    echo "   Found: 'Business creation is exempt from subscription check'\n\n";
} else {
    echo "❌ ERROR: Old middleware code still exists!\n";
    echo "   Missing: 'Business creation is exempt from subscription check'\n\n";
}

// Check for return statement after business creation check
if (preg_match('/if.*POST.*api\/v1\/businesses.*return \$next\(\$request\)/s', $content)) {
    echo "✅ CORRECT: Business creation returns early (skips subscription check)\n\n";
} else {
    echo "❌ ERROR: Business creation does NOT return early!\n\n";
}

// Check for auto-activate logic in BusinessController
$businessControllerFile = __DIR__ . '/app/Http/Controllers/Api/BusinessController.php';
$businessContent = file_get_contents($businessControllerFile);

if (strpos($businessContent, 'Check for pending_payment subscription') !== false) {
    echo "✅ CORRECT: BusinessController has auto-activate logic\n";
    echo "   Found: 'Check for pending_payment subscription'\n\n";
} else {
    echo "❌ ERROR: BusinessController missing auto-activate logic!\n\n";
}

echo "============================================\n";
echo "  NEXT STEPS\n";
echo "============================================\n\n";

echo "If all checks passed above, please:\n";
echo "1. ✅ Restart your web server (php artisan serve or Apache/Nginx)\n";
echo "2. ✅ Try the test again from browser\n";
echo "3. ✅ Check NEW logs (not old logs from before fix)\n\n";

echo "If using php artisan serve:\n";
echo "  - Stop the server (Ctrl+C)\n";
echo "  - Run: php artisan serve\n";
echo "  - Try again\n\n";

echo "If using Apache/Nginx:\n";
echo "  - Restart web server\n";
echo "  - Clear browser cache\n";
echo "  - Try again\n\n";
