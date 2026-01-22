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
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Basic, Pro, Enterprise
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->integer('max_outlets'); // 1, 3, 10, unlimited (-1)
            $table->integer('max_products'); // 100, 1000, unlimited (-1)
            $table->integer('max_employees'); // 5, 20, unlimited (-1)
            $table->boolean('has_online_integration')->default(false);
            $table->boolean('has_advanced_reports')->default(false);
            $table->boolean('has_api_access')->default(false);
            $table->boolean('has_multi_location')->default(false);
            // ✅ NEW: Field untuk mengatur akses laporan dari Filament
            $table->boolean('has_reports_access')->default(false);
            // ✅ NEW: Premium features
            $table->boolean('has_kitchen_access')->default(false);
            $table->boolean('has_tables_access')->default(false);
            $table->boolean('has_attendance_access')->default(false);
            $table->boolean('has_inventory_access')->default(false);
            $table->boolean('has_promo_access')->default(false);
            $table->boolean('has_stock_transfer_access')->default(false);
            $table->json('features')->nullable(); // Additional features
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['is_active', 'sort_order']);
            $table->index('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
