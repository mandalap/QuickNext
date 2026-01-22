<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Outlet;
use App\Models\ProductOutlet;
use Illuminate\Support\Facades\DB;

class ProductOutletSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all products that are marked as global
        $products = Product::where('is_global', true)->get();

        // Get all outlets
        $outlets = Outlet::all();

        if ($products->isEmpty()) {
            $this->command->warn('No global products found. Please create products first.');
            return;
        }

        if ($outlets->isEmpty()) {
            $this->command->warn('No outlets found. Please create outlets first.');
            return;
        }

        $this->command->info('Seeding product_outlets table...');

        // For each global product, create entry for each outlet
        foreach ($products as $product) {
            foreach ($outlets as $outlet) {
                // Check if already exists
                $exists = ProductOutlet::where('product_id', $product->id)
                    ->where('outlet_id', $outlet->id)
                    ->exists();

                if (!$exists) {
                    ProductOutlet::create([
                        'product_id' => $product->id,
                        'outlet_id' => $outlet->id,
                        'stock' => $product->stock ?? 100, // Use product stock or default 100
                        'min_stock' => $product->min_stock ?? 10,
                        'price_override' => null, // No price override by default
                        'is_available' => true,
                    ]);

                    $this->command->info("✓ Created product_outlet: {$product->name} @ {$outlet->name} (Stock: " . ($product->stock ?? 100) . ")");
                }
            }
        }

        $totalCreated = ProductOutlet::count();
        $this->command->info("✅ Product outlets seeded successfully! Total entries: {$totalCreated}");
    }
}
