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
        if (!Schema::hasTable('subscription_plans')) {
            return;
        }

        Schema::table('subscription_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('subscription_plans', 'max_businesses')) {
                $table->integer('max_businesses')
                    ->default(1)
                    ->after('max_employees')
                    ->comment('Maksimal jumlah bisnis yang bisa dibuat oleh user dengan paket ini. -1 untuk unlimited, 1 untuk basic, dll.');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            if (Schema::hasColumn('subscription_plans', 'max_businesses')) {
                $table->dropColumn('max_businesses');
            }
        });
    }
};

