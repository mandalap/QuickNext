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
            if (!Schema::hasColumn('outlets', 'attendance_gps_required')) {
                $table->boolean('attendance_gps_required')
                    ->default(false)
                    ->after('attendance_face_id_required')
                    ->comment('Wajibkan validasi GPS untuk absensi. Jika true, absensi tidak bisa dilakukan jika GPS gagal atau lokasi tidak valid. Jika false, absensi bisa dilakukan tanpa validasi GPS (untuk backward compatibility).');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            if (Schema::hasColumn('outlets', 'attendance_gps_required')) {
                $table->dropColumn('attendance_gps_required');
            }
        });
    }
};

