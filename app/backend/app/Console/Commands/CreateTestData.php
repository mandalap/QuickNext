<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Business;
use App\Models\Category;
use App\Models\Product;

class CreateTestData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'data:create-test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create test data for development';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the test user and business
        $user = User::where('email', 'admin@test.com')->first();
        $business = Business::where('owner_id', $user->id)->first();

        if (!$user || !$business) {
            $this->error('Test user or business not found. Please run user:create-test and business:create-test first.');
            return 1;
        }

        // Create categories
        $categories = [
            ['name' => 'Makanan', 'description' => 'Kategori makanan'],
            ['name' => 'Minuman', 'description' => 'Kategori minuman'],
            ['name' => 'Snack', 'description' => 'Kategori snack'],
        ];

        foreach ($categories as $categoryData) {
            $slug = \Illuminate\Support\Str::slug($categoryData['name']);
            $category = Category::firstOrCreate([
                'name' => $categoryData['name'],
                'business_id' => $business->id,
            ], [
                'slug' => $slug,
                'description' => $categoryData['description'],
                'is_active' => true,
            ]);

            $this->info("Category created: {$category->name}");
        }

        // Create products
        $products = [
            [
                'name' => 'Nasi Goreng',
                'description' => 'Nasi goreng spesial',
                'price' => 15000,
                'category_id' => Category::where('name', 'Makanan')->where('business_id', $business->id)->first()->id,
                'stock' => 50,
                'is_active' => true,
            ],
            [
                'name' => 'Es Teh Manis',
                'description' => 'Es teh manis segar',
                'price' => 5000,
                'category_id' => Category::where('name', 'Minuman')->where('business_id', $business->id)->first()->id,
                'stock' => 100,
                'is_active' => true,
            ],
            [
                'name' => 'Keripik Singkong',
                'description' => 'Keripik singkong renyah',
                'price' => 8000,
                'category_id' => Category::where('name', 'Snack')->where('business_id', $business->id)->first()->id,
                'stock' => 30,
                'is_active' => true,
            ],
        ];

        foreach ($products as $productData) {
            $slug = \Illuminate\Support\Str::slug($productData['name']);
            $sku = 'SKU-' . strtoupper(substr($slug, 0, 8)) . '-' . rand(100, 999);
            $product = Product::firstOrCreate([
                'name' => $productData['name'],
                'business_id' => $business->id,
            ], array_merge($productData, [
                'slug' => $slug,
                'sku' => $sku,
            ]));

            $this->info("Product created: {$product->name} - Rp " . number_format($product->price));
        }

        $this->info("Test data created successfully!");
        $this->info("Categories: " . Category::where('business_id', $business->id)->count());
        $this->info("Products: " . Product::where('business_id', $business->id)->count());

        return 0;
    }
}
