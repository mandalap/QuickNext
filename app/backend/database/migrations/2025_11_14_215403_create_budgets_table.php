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
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('outlet_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('category'); // Bahan Baku, Gaji Karyawan, Utilitas, Marketing, Maintenance, etc
            $table->string('name')->nullable(); // Optional custom name
            $table->text('description')->nullable();
            $table->decimal('budgeted_amount', 15, 2); // Total budget yang dialokasikan
            $table->decimal('actual_amount', 15, 2)->default(0); // Jumlah yang sudah terpakai
            $table->date('start_date'); // Tanggal mulai budget
            $table->date('end_date'); // Tanggal akhir budget
            $table->enum('period', ['daily', 'weekly', 'monthly', 'yearly', 'custom'])->default('monthly');
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index('business_id');
            $table->index(['business_id', 'outlet_id']);
            $table->index(['business_id', 'category']);
            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'start_date', 'end_date']);
            $table->index(['outlet_id', 'start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
