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
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('payroll_number')->unique();
            $table->date('period_start');
            $table->date('period_end');
            $table->integer('year');
            $table->integer('month'); // 1-12
            
            // Salary components
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->decimal('overtime_hours', 8, 2)->default(0);
            $table->decimal('overtime_pay', 15, 2)->default(0);
            $table->decimal('commission', 15, 2)->default(0);
            $table->decimal('bonus', 15, 2)->default(0);
            $table->decimal('allowance', 15, 2)->default(0);
            
            // Deductions
            $table->integer('late_count')->default(0);
            $table->decimal('late_penalty', 15, 2)->default(0);
            $table->decimal('late_penalty_per_occurrence', 15, 2)->default(0); // Denda per kali telat
            $table->integer('absent_count')->default(0);
            $table->decimal('absent_penalty', 15, 2)->default(0);
            $table->decimal('absent_penalty_per_day', 15, 2)->default(0); // Denda per hari absen
            $table->decimal('other_deductions', 15, 2)->default(0);
            
            // Totals
            $table->decimal('gross_salary', 15, 2)->default(0); // Gaji kotor (base + overtime + commission + bonus + allowance)
            $table->decimal('total_deductions', 15, 2)->default(0); // Total potongan
            $table->decimal('net_salary', 15, 2)->default(0); // Gaji bersih (gross - deductions)
            
            // Attendance stats
            $table->integer('total_working_days')->default(0);
            $table->integer('present_days')->default(0);
            $table->integer('absent_days')->default(0);
            $table->decimal('total_working_hours', 8, 2)->default(0);
            
            // Status
            $table->enum('status', ['draft', 'calculated', 'approved', 'paid', 'cancelled'])->default('draft');
            $table->date('paid_at')->nullable();
            $table->text('notes')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['business_id', 'year', 'month']);
            $table->index(['employee_id', 'year', 'month']);
            $table->index('payroll_number');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payrolls');
    }
};
