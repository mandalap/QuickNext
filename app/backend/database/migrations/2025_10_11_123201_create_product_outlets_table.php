<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('product_outlets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('outlet_id')->constrained('outlets')->onDelete('cascade');
            $table->integer('stock')->default(0);
            $table->integer('min_stock')->default(10);
            $table->decimal('price_override', 10, 2)->nullable(); // Outlet-specific pricing
            $table->boolean('is_available')->default(true);
            $table->timestamps();

            // Unique constraint - one product per outlet
            $table->unique(['product_id', 'outlet_id']);

            // Indexes for performance
            $table->index(['outlet_id', 'is_available']);
            $table->index(['product_id', 'outlet_id']);
            $table->index('stock');
        });

        // Create product_outlets records for all existing products and outlets
        // For global products only
        DB::statement("
            INSERT INTO product_outlets (product_id, outlet_id, stock, min_stock, is_available, created_at, updated_at)
            SELECT
                p.id as product_id,
                o.id as outlet_id,
                COALESCE(p.stock, 0) as stock,
                COALESCE(p.min_stock, 10) as min_stock,
                1 as is_available,
                NOW() as created_at,
                NOW() as updated_at
            FROM products p
            CROSS JOIN outlets o
            WHERE p.business_id = o.business_id
            AND p.is_global = 1
            AND NOT EXISTS (
                SELECT 1 FROM product_outlets po
                WHERE po.product_id = p.id AND po.outlet_id = o.id
            )
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_outlets');
    }
};
