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
        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_subscription_id')->constrained()->onDelete('cascade');
            $table->string('payment_code')->unique();
            $table->decimal('amount', 15, 2);
            $table->enum('status', ['pending', 'paid', 'failed', 'cancelled', 'refunded']);
            $table->string('payment_method'); // bank_transfer, e_wallet, credit_card
            $table->string('payment_gateway')->nullable(); // midtrans, xendit, etc
            $table->string('gateway_payment_id')->nullable();
            $table->json('payment_data')->nullable(); // Gateway response data
            $table->datetime('paid_at')->nullable();
            $table->datetime('expires_at')->nullable(); // Payment expiry
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Indexes for performance
            $table->index(['user_subscription_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index(['payment_method', 'status']);
            $table->index('payment_code');
            $table->index('gateway_payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
    }
};
