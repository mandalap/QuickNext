<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add discount_id column
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('discount_id')->nullable()->after('discount_amount')->constrained()->onDelete('set null');
        });

        // Modify type enum to include 'self_service'
        DB::statement("ALTER TABLE `orders` MODIFY COLUMN `type` ENUM('dine_in', 'takeaway', 'delivery', 'online', 'self_service') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['discount_id']);
            $table->dropColumn('discount_id');
        });

        // Revert type enum
        DB::statement("ALTER TABLE `orders` MODIFY COLUMN `type` ENUM('dine_in', 'takeaway', 'delivery', 'online') NOT NULL");
    }
};
