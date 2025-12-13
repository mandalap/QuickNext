<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Outlet Information ===\n\n";

$outlets = DB::table('outlets')->where('is_active', true)->get();

if ($outlets->isEmpty()) {
    echo "❌ No active outlets found.\n";
    exit(1);
}

echo "Active Outlets:\n";
echo str_repeat('=', 80) . "\n";

foreach ($outlets as $outlet) {
    echo sprintf("%-30s | Slug: %-25s | ID: %d\n",
        $outlet->name,
        $outlet->slug,
        $outlet->id
    );
    echo "Public URL: http://localhost:3000/order/{$outlet->slug}\n";
    echo "API URL: http://localhost:8000/api/public/v1/order/{$outlet->slug}/menu\n";
    echo str_repeat('-', 80) . "\n";
}

echo "\n✅ Total active outlets: " . $outlets->count() . "\n";
