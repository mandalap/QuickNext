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
     * ✅ FIX: Menambahkan nilai 'refunded' ke ENUM status untuk mendukung refund order
     */
    public function up(): void
    {
        // MySQL: Untuk menambahkan nilai ke ENUM, kita perlu MODIFY COLUMN dengan semua nilai
        // Cek dulu apakah ada laundry status (dari migration sebelumnya)
        // Jika ada, tambahkan 'refunded' ke semua status yang ada
        DB::statement("ALTER TABLE `orders` MODIFY COLUMN `status` ENUM(
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'completed',
            'cancelled',
            'received',
            'washing',
            'ironing',
            'picked_up',
            'refunded'
        ) NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Kembalikan ke status tanpa 'refunded' (tapi tetap dengan laundry status)
        DB::statement("ALTER TABLE `orders` MODIFY COLUMN `status` ENUM(
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'completed',
            'cancelled',
            'received',
            'washing',
            'ironing',
            'picked_up'
        ) NOT NULL DEFAULT 'pending'");
    }
};
