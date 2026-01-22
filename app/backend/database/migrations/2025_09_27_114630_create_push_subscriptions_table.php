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
        // ✅ FIX: Create table first without foreign key to businesses (will be added later)
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            // ✅ FIX: Use unsignedBigInteger instead of foreignId to avoid FK constraint error
            // Foreign key will be added in a separate migration after businesses table is created
            $table->unsignedBigInteger('business_id')->nullable();
            $table->string('endpoint')->unique();
            $table->text('p256dh');
            $table->text('auth');
            $table->timestamps();

            // Indexes for better query performance
            $table->index(['user_id', 'business_id']);
            $table->index('endpoint');
        });
        
        // ✅ FIX: Foreign key constraint will be added in separate migration
        // (2025_12_10_215836_add_foreign_keys_to_push_subscriptions_table.php)
        // This ensures businesses table is created first
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
