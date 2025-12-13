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
        Schema::create('online_platforms', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // GrabFood, GoFood, ShopeeFood, etc
            $table->string('slug')->unique();
            $table->decimal('commission_rate', 5, 2);
            $table->json('api_config')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Indexes for performance
            $table->index(['is_active', 'name']);
            $table->index('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('online_platforms');
    }
};
