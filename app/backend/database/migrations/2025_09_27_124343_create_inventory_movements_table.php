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
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('ingredient_id')->nullable()->constrained()->onDelete('cascade');
            $table->enum('type', ['in', 'out', 'adjustment']);
            $table->enum('reason', ['purchase', 'sale', 'waste', 'adjustment', 'transfer']);
            $table->integer('quantity');
            $table->integer('stock_before');
            $table->integer('stock_after');
            $table->string('reference_type')->nullable(); // order, purchase, etc
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['product_id', 'type', 'created_at']);
            $table->index(['ingredient_id', 'type', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
            $table->index(['type', 'reason', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
