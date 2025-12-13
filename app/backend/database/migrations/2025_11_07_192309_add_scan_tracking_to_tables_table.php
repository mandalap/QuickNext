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
        Schema::table('tables', function (Blueprint $table) {
            // ✅ NEW: Add scan tracking columns
            $table->integer('scan_count')->default(0)->after('status');
            $table->timestamp('last_scan_at')->nullable()->after('scan_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->dropColumn(['scan_count', 'last_scan_at']);
        });
    }
};
