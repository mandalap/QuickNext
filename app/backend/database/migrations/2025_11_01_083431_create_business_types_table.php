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
        Schema::create('business_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // restaurant, retail, laundry, salon, etc
            $table->string('name'); // Restaurant & Cafe, Retail Store, Laundry, etc
            $table->text('description')->nullable();
            $table->string('icon')->nullable(); // Icon name for UI
            $table->boolean('has_products')->default(true); // Support products
            $table->boolean('has_services')->default(false); // Support services
            $table->boolean('requires_stock')->default(true); // Need inventory tracking
            $table->boolean('requires_tables')->default(false); // Restaurant table management
            $table->boolean('requires_kitchen')->default(false); // Kitchen order management
            $table->json('order_statuses')->nullable(); // Custom order status flow
            $table->json('pricing_models')->nullable(); // per_unit, per_kg, per_item, etc
            $table->json('order_fields')->nullable(); // weight, item_type, special_notes, etc
            $table->json('features')->nullable(); // enabled features
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('business_types');
    }
};
