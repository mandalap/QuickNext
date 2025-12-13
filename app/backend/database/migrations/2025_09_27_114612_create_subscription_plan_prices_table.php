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
        Schema::create('subscription_plan_prices', function (Blueprint $table) {
            $table->id();
             $table->foreignId('subscription_plan_id')->constrained()->onDelete('cascade');
            $table->enum('duration_type', ['monthly', 'quarterly', 'semi_annual', 'annual']);
            $table->integer('duration_months'); // 1, 3, 6, 12
            $table->decimal('price', 15, 2);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('final_price', 15, 2); // After discount
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            // Indexes for performance
            $table->index(['subscription_plan_id', 'is_active']);
            $table->index(['duration_type', 'is_active']);
            $table->unique(['subscription_plan_id', 'duration_type'], 'plan_price_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plan_prices');
    }
};
