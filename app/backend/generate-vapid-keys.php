<?php
/**
 * Script to generate VAPID keys for Push Notifications
 *
 * Usage: php generate-vapid-keys.php
 *
 * This script generates VAPID keys using web-push library
 * Make sure to install web-push first: composer require minishlink/web-push
 */

require __DIR__ . '/vendor/autoload.php';

use Minishlink\WebPush\VAPID;

echo "🔑 Generating VAPID Keys for Push Notifications\n";
echo "===============================================\n\n";

try {
    // Generate VAPID keys
    $keys = VAPID::createVapidKeys();

    echo "✅ VAPID Keys Generated Successfully!\n\n";
    echo "📋 Add these to your environment variables:\n\n";
    echo "Backend (.env):\n";
    echo "VAPID_PUBLIC_KEY={$keys['publicKey']}\n";
    echo "VAPID_PRIVATE_KEY={$keys['privateKey']}\n";
    echo "VAPID_SUBJECT=mailto:admin@quickkasir.com\n\n";

    echo "Frontend (.env.local):\n";
    echo "REACT_APP_VAPID_PUBLIC_KEY={$keys['publicKey']}\n\n";

    echo "⚠️  IMPORTANT: Keep these keys secure!\n";
    echo "   - Never commit private key to version control\n";
    echo "   - Use different keys for development and production\n";
    echo "   - The public key can be shared, but private key must be kept secret\n\n";

} catch (\Exception $e) {
    echo "❌ Error generating VAPID keys: " . $e->getMessage() . "\n";
    echo "\n💡 Make sure you have installed web-push:\n";
    echo "   composer require minishlink/web-push\n";
    exit(1);
}
