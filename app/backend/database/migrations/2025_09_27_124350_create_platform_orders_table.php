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
        Schema::create('platform_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('platform_id')->constrained('online_platforms')->onDelete('cascade');
            $table->string('platform_order_id');
            $table->decimal('platform_fee', 15, 2)->default(0);
            $table->decimal('commission_amount', 15, 2)->default(0);
            $table->json('platform_data')->nullable();
            $table->timestamps();

            $table->unique(['platform_id', 'platform_order_id']);

            // Indexes for performance
            $table->index(['order_id']);
            $table->index(['platform_id', 'created_at']);
            $table->index('platform_order_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_orders');
    }
};
