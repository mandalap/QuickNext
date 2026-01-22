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
        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('outlet_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Kasir yang buka shift
            $table->foreignId('employee_id')->nullable()->constrained()->onDelete('set null'); // Employee record

            // Shift info
            $table->string('shift_name')->nullable(); // "Shift Pagi", "Shift Siang", "Shift Malam"
            $table->enum('status', ['open', 'closed'])->default('open');

            // Timestamps
            $table->timestamp('opened_at'); // Waktu buka shift
            $table->timestamp('closed_at')->nullable(); // Waktu tutup shift

            // Modal awal (opening balance)
            $table->decimal('opening_balance', 15, 2)->default(0); // Uang kembalian awal

            // Expected balance (dihitung dari transaksi)
            $table->decimal('expected_cash', 15, 2)->default(0); // Cash yang seharusnya ada
            $table->decimal('expected_card', 15, 2)->default(0); // Total kartu
            $table->decimal('expected_transfer', 15, 2)->default(0); // Total transfer
            $table->decimal('expected_qris', 15, 2)->default(0); // Total QRIS
            $table->decimal('expected_total', 15, 2)->default(0); // Total semua metode

            // Actual balance (input kasir saat tutup shift)
            $table->decimal('actual_cash', 15, 2)->nullable(); // Uang fisik yang dihitung kasir
            $table->decimal('actual_card', 15, 2)->nullable(); // Kartu (biasanya sama dengan expected)
            $table->decimal('actual_transfer', 15, 2)->nullable(); // Transfer (biasanya sama)
            $table->decimal('actual_qris', 15, 2)->nullable(); // QRIS (biasanya sama)
            $table->decimal('actual_total', 15, 2)->nullable(); // Total actual

            // Selisih (difference)
            $table->decimal('cash_difference', 15, 2)->default(0); // Selisih tunai (actual - expected)
            $table->decimal('total_difference', 15, 2)->default(0); // Selisih total

            // Transaction counts
            $table->integer('total_transactions')->default(0); // Jumlah transaksi
            $table->integer('cash_transactions')->default(0); // Transaksi tunai
            $table->integer('card_transactions')->default(0); // Transaksi kartu
            $table->integer('transfer_transactions')->default(0); // Transaksi transfer
            $table->integer('qris_transactions')->default(0); // Transaksi QRIS

            // Notes
            $table->text('opening_notes')->nullable(); // Catatan saat buka shift
            $table->text('closing_notes')->nullable(); // Catatan saat tutup shift

            // Audit
            $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->onDelete('set null'); // Siapa yang tutup (bisa supervisor)

            $table->timestamps();
            $table->softDeletes(); // Soft delete untuk audit trail

            // Indexes
            $table->index(['business_id', 'outlet_id', 'status']);
            $table->index(['user_id', 'opened_at']);
            $table->index(['opened_at', 'closed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cashier_shifts');
    }
};
