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
        Schema::create('taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('outlet_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('type'); // PPN, PPh 21, PPh 23, PPh Final, etc
            $table->string('description')->nullable(); // Deskripsi pajak
            $table->decimal('rate', 5, 2); // Tarif pajak dalam persen (misal: 11.00 untuk 11%)
            $table->decimal('base', 15, 2); // Dasar pengenaan pajak
            $table->decimal('amount', 15, 2); // Jumlah pajak yang harus dibayar
            $table->date('due_date'); // Tanggal jatuh tempo
            $table->date('period_start'); // Periode mulai (untuk laporan)
            $table->date('period_end'); // Periode akhir (untuk laporan)
            $table->string('period'); // Periode dalam format "Januari 2024"
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending');
            $table->text('notes')->nullable(); // Catatan tambahan
            $table->timestamp('paid_at')->nullable(); // Tanggal pembayaran
            $table->string('payment_reference')->nullable(); // Nomor referensi pembayaran
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index('business_id');
            $table->index(['business_id', 'outlet_id']);
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'type']);
            $table->index('due_date');
            $table->index(['business_id', 'period_start', 'period_end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('taxes');
    }
};
