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
        Schema::table('outlets', function (Blueprint $table) {
            // Shift Pagi
            $table->time('shift_pagi_start')->nullable()->after('attendance_radius')->default('08:00:00')->comment('Jam mulai shift pagi');
            $table->time('shift_pagi_end')->nullable()->after('shift_pagi_start')->default('17:00:00')->comment('Jam selesai shift pagi');
            
            // Shift Siang
            $table->time('shift_siang_start')->nullable()->after('shift_pagi_end')->default('12:00:00')->comment('Jam mulai shift siang');
            $table->time('shift_siang_end')->nullable()->after('shift_siang_start')->default('21:00:00')->comment('Jam selesai shift siang');
            
            // Shift Malam
            $table->time('shift_malam_start')->nullable()->after('shift_siang_end')->default('20:00:00')->comment('Jam mulai shift malam');
            $table->time('shift_malam_end')->nullable()->after('shift_malam_start')->default('05:00:00')->comment('Jam selesai shift malam');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->dropColumn([
                'shift_pagi_start',
                'shift_pagi_end',
                'shift_siang_start',
                'shift_siang_end',
                'shift_malam_start',
                'shift_malam_end',
            ]);
        });
    }
};
