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
        // Update businesses table logo column to LONGTEXT
        Schema::table('businesses', function (Blueprint $table) {
            $table->longText('logo')->nullable()->change();
        });

        // Update outlets table logo column to LONGTEXT
        Schema::table('outlets', function (Blueprint $table) {
            $table->longText('logo')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert businesses table logo column back to VARCHAR(255)
        Schema::table('businesses', function (Blueprint $table) {
            $table->string('logo', 255)->nullable()->change();
        });

        // Revert outlets table logo column back to VARCHAR(255)
        Schema::table('outlets', function (Blueprint $table) {
            $table->string('logo', 255)->nullable()->change();
        });
    }
};
