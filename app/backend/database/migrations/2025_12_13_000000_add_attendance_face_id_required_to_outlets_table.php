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
            if (!Schema::hasColumn('outlets', 'attendance_face_id_required')) {
                $table->boolean('attendance_face_id_required')
                    ->default(false)
                    ->after('attendance_radius')
                    ->comment('Wajibkan FaceID untuk absensi (checkin/checkout). Jika true, karyawan harus menggunakan FaceID. Jika false, bisa menggunakan tombol saja.');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            if (Schema::hasColumn('outlets', 'attendance_face_id_required')) {
                $table->dropColumn('attendance_face_id_required');
            }
        });
    }
};

