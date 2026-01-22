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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->string('payment_method'); // cash, card, bank_transfer, e_wallet, etc
            $table->decimal('amount', 15, 2);
            $table->string('reference_number')->nullable();
            $table->json('payment_data')->nullable();
            $table->enum('status', ['pending', 'success', 'failed', 'cancelled']);
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['order_id', 'status']);
            $table->index(['payment_method', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('reference_number');
            $table->index('paid_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
