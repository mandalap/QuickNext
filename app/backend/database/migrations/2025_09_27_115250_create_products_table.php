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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->string('sku');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->decimal('price', 15, 2);
            $table->decimal('cost', 15, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->integer('min_stock')->default(0);
            $table->enum('stock_type', ['tracked', 'untracked'])->default('tracked');
            $table->boolean('is_active')->default(true);
            $table->boolean('has_variants')->default(false);
            $table->json('tax_ids')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['business_id', 'slug']);
            $table->unique(['business_id', 'sku']);

            // Indexes for performance
            $table->index('business_id');
            $table->index(['business_id', 'category_id']);
            $table->index(['business_id', 'is_active']);
            $table->index(['business_id', 'stock_type', 'is_active']);
            $table->index(['stock', 'min_stock']); // For low stock alerts
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
