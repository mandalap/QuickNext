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
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_id')->constrained('payrolls')->onDelete('cascade');
            $table->enum('type', ['earning', 'deduction']); // earning = pendapatan, deduction = potongan
            $table->string('category'); // late_penalty, absent_penalty, overtime, commission, bonus, allowance, other
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->integer('quantity')->default(1); // Untuk late_count, absent_count, overtime_hours, dll
            $table->decimal('rate', 15, 2)->nullable(); // Rate per unit (untuk overtime, late penalty, dll)
            $table->date('date')->nullable(); // Tanggal kejadian (untuk late, absent, dll)
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('payroll_id');
            $table->index(['payroll_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
    }
};
