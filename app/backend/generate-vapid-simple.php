<?php
require __DIR__ . '/vendor/autoload.php';

use Minishlink\WebPush\VAPID;

try {
    $keys = VAPID::createVapidKeys();
    
    echo "VAPID_PUBLIC_KEY=" . $keys['publicKey'] . "\n";
    echo "VAPID_PRIVATE_KEY=" . $keys['privateKey'] . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

