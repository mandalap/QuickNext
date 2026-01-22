<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;

$shift = CashierShift::find(22);

echo "SHIFT ID 22 DETAILS\n";
echo "===================\n";
foreach ($shift->getAttributes() as $key => $value) {
    if (!in_array($key, ['created_at', 'updated_at', 'deleted_at'])) {
        echo str_pad($key, 25) . ": " . ($value ?? 'NULL') . "\n";
    }
}
