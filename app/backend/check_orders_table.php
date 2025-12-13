<?php
/**
 * Script untuk memeriksa struktur tabel orders
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔍 Orders Table Structure\n";
echo "=========================\n\n";

try {
    $columns = DB::select('DESCRIBE orders');
    echo "Columns in orders table:\n";
    foreach($columns as $column) {
        echo "- {$column->Field} ({$column->Type})\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n✅ Check selesai!\n";
?>


























































