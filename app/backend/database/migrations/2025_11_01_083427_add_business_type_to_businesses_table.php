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
        // Check if business_types table exists before adding foreign key
        if (!Schema::hasTable('business_types')) {
            return;
        }
        
        Schema::table('businesses', function (Blueprint $table) {
            // Check if column already exists before adding
            if (!Schema::hasColumn('businesses', 'business_type_id')) {
                $table->foreignId('business_type_id')->nullable()->after('owner_id')->constrained('business_types')->onDelete('set null');
                $table->index('business_type_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropForeign(['business_type_id']);
            $table->dropIndex(['business_type_id']);
            $table->dropColumn('business_type_id');
        });
    }
};
