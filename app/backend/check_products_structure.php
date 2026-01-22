<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Products Structure ===\n\n";

try {
    $columns = DB::select('SHOW COLUMNS FROM products');

    echo "Columns in 'products' table:\n";
    echo str_repeat('-', 60) . "\n";

    foreach ($columns as $col) {
        echo sprintf("%-20s | %-20s | Null: %-5s\n",
            $col->Field,
            $col->Type,
            $col->Null
        );
    }

    echo str_repeat('-', 60) . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
