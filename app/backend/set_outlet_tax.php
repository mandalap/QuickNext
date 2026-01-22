<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find the table by QR code
$table = \App\Models\Table::where('qr_code', 'QR-FFJUWUME')->first();

if ($table) {
    $outlet = $table->outlet;
    echo "Outlet: {$outlet->name}\n";
    echo "Current tax_rate: " . ($outlet->tax_rate ?? 'NULL') . "\n";

    $outlet->tax_rate = 10.00;
    $outlet->save();

    echo "Updated tax_rate to: {$outlet->tax_rate}%\n";
    echo "Tax will be applied to all self-service orders at this outlet.\n";
} else {
    echo "Table with QR code 'QR-FFJUWUME' not found\n";
}
