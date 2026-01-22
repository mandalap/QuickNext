<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Product;

echo "=== CHECKING PRODUCTS WITH IMAGES ===\n\n";

$products = Product::whereNotNull('image')->get(['id', 'name', 'image']);

if ($products->count() > 0) {
    echo "Found " . $products->count() . " products with images:\n";
    foreach ($products as $product) {
        echo "- ID: {$product->id} | Name: {$product->name} | Image: {$product->image}\n";

        // Check if file exists
        $imagePath = public_path($product->image);
        if (file_exists($imagePath)) {
            echo "  ✓ File exists: {$imagePath}\n";
        } else {
            echo "  ✗ File NOT found: {$imagePath}\n";
        }
        echo "\n";
    }
} else {
    echo "No products with images found.\n\n";
}

echo "=== ALL PRODUCTS ===\n\n";
$allProducts = Product::all(['id', 'name', 'image']);
foreach ($allProducts as $product) {
    echo "- ID: {$product->id} | Name: {$product->name} | Image: " . ($product->image ?? 'NULL') . "\n";
}

echo "\n=== CHECKING STORAGE DIRECTORY ===\n";
$storagePath = public_path('storage/products');
if (is_dir($storagePath)) {
    $files = scandir($storagePath);
    $imageFiles = array_filter($files, function($file) {
        return in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif', 'webp']);
    });

    if (count($imageFiles) > 0) {
        echo "Found " . count($imageFiles) . " image files in storage:\n";
        foreach ($imageFiles as $file) {
            echo "- {$file}\n";
        }
    } else {
        echo "No image files found in storage directory.\n";
    }
} else {
    echo "Storage directory does not exist: {$storagePath}\n";
}












































































