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
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('current_subscription_id')->nullable()->constrained('user_subscriptions')->onDelete('set null');
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('logo')->nullable();
            $table->string('tax_number')->nullable();
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->string('currency', 3)->default('IDR');
            $table->json('settings')->nullable();
            $table->enum('status', ['active', 'suspended', 'expired'])->default('active');
            $table->datetime('subscription_expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['owner_id', 'status']);
            $table->index(['status', 'subscription_expires_at']);
            $table->index('slug');
            $table->index('current_subscription_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
