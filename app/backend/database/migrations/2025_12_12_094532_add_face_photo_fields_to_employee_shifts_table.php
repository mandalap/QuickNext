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
            $table->string('clock_in_photo')->nullable()->after('clock_in_longitude');
            $table->string('clock_out_photo')->nullable()->after('clock_out_longitude');
            $table->decimal('face_match_confidence', 5, 2)->nullable()->after('clock_out_photo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_shifts', function (Blueprint $table) {
            $table->dropColumn(['clock_in_photo', 'clock_out_photo', 'face_match_confidence']);
        });
    }
};
