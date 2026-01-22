<?php

require __DIR__.'/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Creating Sample QR Tables ===\n\n";

// Get first outlet
$outlet = DB::table('outlets')->first();

if (!$outlet) {
    echo "❌ No outlet found. Please create an outlet first.\n";
    exit(1);
}

echo "✅ Found outlet: {$outlet->name} (ID: {$outlet->id})\n\n";

// Check existing tables
$existingTables = DB::table('tables')->where('outlet_id', $outlet->id)->get();

echo "📊 Existing tables for this outlet: " . $existingTables->count() . "\n";

if ($existingTables->count() > 0) {
    echo "\nExisting QR Codes:\n";
    echo str_repeat('-', 60) . "\n";
    foreach ($existingTables as $table) {
        echo sprintf("Table: %-15s | QR: %-15s | Status: %s\n",
            $table->name,
            $table->qr_code,
            $table->status
        );
        echo "URL: http://localhost:3000/self-service/{$table->qr_code}\n";
        echo str_repeat('-', 60) . "\n";
    }
} else {
    echo "\n⚠️  No tables found. Creating sample tables...\n\n";

    // Create sample tables
    $sampleTables = [
        ['name' => 'Table 1', 'capacity' => 4],
        ['name' => 'Table 2', 'capacity' => 4],
        ['name' => 'Table 3', 'capacity' => 6],
    ];

    foreach ($sampleTables as $tableData) {
        $qrCode = 'QR-' . strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 7));

        $tableId = DB::table('tables')->insertGetId([
            'outlet_id' => $outlet->id,
            'name' => $tableData['name'],
            'qr_code' => $qrCode,
            'capacity' => $tableData['capacity'],
            'status' => 'available',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        echo "✅ Created {$tableData['name']} with QR: {$qrCode}\n";
        echo "   URL: http://localhost:3000/self-service/{$qrCode}\n\n";
    }

    echo "\n" . str_repeat('=', 60) . "\n";
    echo "✅ Sample tables created successfully!\n";
    echo str_repeat('=', 60) . "\n";
}

// Show QR code URLs for testing
echo "\n\n📱 Test URLs (copy these to browser):\n";
echo str_repeat('=', 60) . "\n";
$tables = DB::table('tables')->where('outlet_id', $outlet->id)->get();
foreach ($tables as $table) {
    echo "{$table->name}: http://localhost:3000/self-service/{$table->qr_code}\n";
}
echo str_repeat('=', 60) . "\n";

echo "\n✅ Done!\n";
