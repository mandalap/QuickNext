<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * ✅ FIX: Add business_type_id column to businesses table
     * This migration fixes the issue where the column was not added because
     * the business_types table didn't exist when the original migration ran.
     */
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            // Check if column already exists before adding
            if (!Schema::hasColumn('businesses', 'business_type_id')) {
                // Check if business_types table exists
                if (Schema::hasTable('business_types')) {
                    $table->foreignId('business_type_id')
                        ->nullable()
                        ->after('owner_id')
                        ->constrained('business_types')
                        ->onDelete('set null');
                    $table->index('business_type_id');
                } else {
                    // If table doesn't exist, add column without foreign key constraint
                    $table->unsignedBigInteger('business_type_id')->nullable()->after('owner_id');
                    $table->index('business_type_id');
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            if (Schema::hasColumn('businesses', 'business_type_id')) {
                // Drop foreign key if exists
                try {
                    $table->dropForeign(['business_type_id']);
                } catch (\Exception $e) {
                    // Foreign key might not exist, ignore
                }
                // Drop index if exists
                try {
                    $table->dropIndex(['business_type_id']);
                } catch (\Exception $e) {
                    // Index might not exist, ignore
                }
                // Drop column
                $table->dropColumn('business_type_id');
            }
        });
    }
};
