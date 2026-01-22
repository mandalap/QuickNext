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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('outlet_id')->constrained()->onDelete('cascade');
            $table->foreignId('customer_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('table_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('employee_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('type', ['dine_in', 'takeaway', 'delivery', 'online']);
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']);
            $table->decimal('subtotal', 15, 2);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('service_charge', 15, 2)->default(0);
            $table->decimal('delivery_fee', 15, 2)->default(0);
            $table->decimal('total', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->enum('payment_status', ['pending', 'partial', 'paid', 'refunded']);
            $table->json('customer_data')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('ordered_at');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index('business_id');
            $table->index(['business_id', 'outlet_id']);
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'type', 'status']);
            $table->index(['business_id', 'payment_status']);
            $table->index(['business_id', 'created_at']);
            $table->index(['outlet_id', 'status']);
            $table->index(['customer_id']);
            $table->index(['employee_id']);
            $table->index('order_number');
            $table->index('ordered_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
