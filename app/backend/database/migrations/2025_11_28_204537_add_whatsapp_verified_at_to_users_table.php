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
        Schema::table('users', function (Blueprint $table) {
            // ✅ FIX: Add whatsapp_verified_at column to track WhatsApp verification
            if (!Schema::hasColumn('users', 'whatsapp_verified_at')) {
                $table->timestamp('whatsapp_verified_at')->nullable()->after('phone');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'whatsapp_verified_at')) {
                $table->dropColumn('whatsapp_verified_at');
            }
        });
    }
};
