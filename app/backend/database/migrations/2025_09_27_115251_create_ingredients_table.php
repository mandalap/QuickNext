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
        Schema::create('ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('category')->nullable(); // Category for grouping ingredients
            $table->string('unit'); // kg, gram, liter, etc
            $table->decimal('cost_per_unit', 15, 2);
            $table->decimal('current_stock', 15, 2)->default(0);
            $table->decimal('min_stock', 15, 2)->default(0);
            $table->string('supplier')->nullable(); // Supplier name
            $table->date('expiry_date')->nullable(); // Expiry date for perishable items
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index('business_id');
            $table->index(['business_id', 'name']);
            $table->index(['current_stock', 'min_stock']); // For low stock alerts
            $table->index('expiry_date'); // For tracking expiring items
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
