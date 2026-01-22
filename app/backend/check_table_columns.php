<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "Checking subscription_payments table structure...\n\n";

$columns = DB::select("DESCRIBE subscription_payments");

echo "Columns in subscription_payments:\n";
echo str_repeat("-", 80) . "\n";
foreach ($columns as $column) {
    echo "• " . $column->Field . " (" . $column->Type . ")\n";
}
