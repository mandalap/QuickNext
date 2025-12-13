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
        Schema::table('employee_shifts', function (Blueprint $table) {
            // Add indexes for clock_in and clock_out queries
            if (!Schema::hasColumn('employee_shifts', 'clock_in')) {
                return; // Column doesn't exist, skip
            }
            
            // Index for finding active shifts (clocked in but not out)
            $table->index(['user_id', 'shift_date', 'clock_in', 'clock_out'], 'emp_shifts_user_date_clock_idx');
            
            // Index for finding today's shifts
            $table->index(['business_id', 'user_id', 'shift_date', 'clock_in'], 'emp_shifts_business_user_date_clock_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_shifts', function (Blueprint $table) {
            $table->dropIndex('emp_shifts_user_date_clock_idx');
            $table->dropIndex('emp_shifts_business_user_date_clock_idx');
        });
    }
};

