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
        Schema::table('discounts', function (Blueprint $table) {
            // Add outlet_id column (nullable for business-wide discounts)
            $table->foreignId('outlet_id')->nullable()->constrained()->onDelete('cascade');

            // Add index for performance
            $table->index(['business_id', 'outlet_id']);
            $table->index(['outlet_id', 'is_active']);

            // Update unique constraint to include outlet_id
            $table->dropUnique(['business_id', 'code']);
            $table->unique(['business_id', 'outlet_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discounts', function (Blueprint $table) {
            // Drop the new unique constraint
            $table->dropUnique(['business_id', 'outlet_id', 'code']);

            // Restore original unique constraint
            $table->unique(['business_id', 'code']);

            // ✅ PERBAIKAN: Drop foreign key constraint FIRST before dropping indexes
            // Foreign key constraint must be dropped before indexes that reference the column
            $table->dropForeign(['outlet_id']);

            // Drop indexes AFTER foreign key is dropped
            $table->dropIndex(['business_id', 'outlet_id']);
            $table->dropIndex(['outlet_id', 'is_active']);

            // Finally drop outlet_id column
            $table->dropColumn('outlet_id');
        });
    }
};












