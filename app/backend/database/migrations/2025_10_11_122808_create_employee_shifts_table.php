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
        Schema::create('employee_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('outlet_id')->constrained('outlets')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('shift_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->time('clock_in')->nullable();
            $table->time('clock_out')->nullable();
            $table->enum('status', ['scheduled', 'ongoing', 'completed', 'absent', 'late'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['outlet_id', 'shift_date', 'status']);
            $table->index(['user_id', 'shift_date']);
            $table->index(['business_id', 'shift_date']);

            // Prevent duplicate shifts for same user at same time
            $table->unique(['user_id', 'shift_date', 'start_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_shifts');
    }
};
