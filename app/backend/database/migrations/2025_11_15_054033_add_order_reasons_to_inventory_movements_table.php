<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * ✅ FIX: Menambahkan nilai baru ke ENUM reason untuk mendukung:
     * - refunded_order (order yang di-refund)
     * - cancelled_order (order yang dibatalkan)
     * - deleted_order (order yang dihapus)
     */
    public function up(): void
    {
        // MySQL: Untuk menambahkan nilai ke ENUM, kita perlu MODIFY COLUMN dengan semua nilai
        DB::statement("ALTER TABLE `inventory_movements` MODIFY COLUMN `reason` ENUM(
            'purchase',
            'sale',
            'waste',
            'adjustment',
            'transfer',
            'refunded_order',
            'cancelled_order',
            'deleted_order'
        ) NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Kembalikan ke nilai ENUM asli
        DB::statement("ALTER TABLE `inventory_movements` MODIFY COLUMN `reason` ENUM(
            'purchase',
            'sale',
            'waste',
            'adjustment',
            'transfer'
        ) NOT NULL");
    }
};
