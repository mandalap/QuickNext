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
        // Most tables already have adequate indexes from their create migrations
        // We only add essential missing indexes here

        // Products table - add is_global index for filtering
        if (Schema::hasTable('products') && !$this->hasIndex('products', 'products_is_global_index')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index('is_global', 'products_is_global_index');
            });
        }

        // Skip other indexes as they likely already exist or are not critical
        // Can be added individually later if needed
    }

    protected function hasIndex($table, $index)
    {
        $indexes = DB::select("SHOW INDEX FROM $table WHERE Key_name = '$index'");
        return count($indexes) > 0;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop only the indexes we added
        if (Schema::hasTable('products') && $this->hasIndex('products', 'products_is_global_index')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropIndex('products_is_global_index');
            });
        }
    }
};
