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
        Schema::create('user_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_plan_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_plan_price_id')->constrained()->onDelete('cascade');
            $table->string('subscription_code')->unique();
            $table->enum('status', ['active', 'expired', 'cancelled', 'suspended', 'pending_payment']);
            $table->decimal('amount_paid', 15, 2);
            $table->datetime('starts_at');
            $table->datetime('ends_at');
            $table->datetime('trial_ends_at')->nullable();
            $table->boolean('is_trial')->default(false);
            $table->json('plan_features')->nullable(); // Snapshot of features at time of subscription
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['user_id', 'status']);
            $table->index(['status', 'ends_at']);
            $table->index(['starts_at', 'ends_at']);
            $table->index('subscription_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_subscriptions');
    }
};
