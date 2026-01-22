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
        if (!Schema::hasTable('outlets')) {
            return;
        }

        Schema::table('outlets', function (Blueprint $table) {
            if (!Schema::hasColumn('outlets', 'working_days')) {
                $table->json('working_days')
                    ->nullable()
                    ->after('shift_malam_end')
                    ->comment('Hari kerja outlet (1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu, 0=Minggu). Default: [1,2,3,4,5] untuk Senin-Jumat');
            }
        });

        // Set default working days for existing outlets (Monday-Friday)
        \DB::table('outlets')->whereNull('working_days')->update([
            'working_days' => json_encode([1, 2, 3, 4, 5]) // Senin-Jumat
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            if (Schema::hasColumn('outlets', 'working_days')) {
                $table->dropColumn('working_days');
            }
        });
    }
};
