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
        // For MySQL, we need to modify the enum column
        DB::statement("ALTER TABLE user_subscriptions MODIFY COLUMN status ENUM('active', 'expired', 'cancelled', 'suspended', 'pending_payment', 'upgraded') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'upgraded' from enum
        DB::statement("ALTER TABLE user_subscriptions MODIFY COLUMN status ENUM('active', 'expired', 'cancelled', 'suspended', 'pending_payment') NOT NULL");
    }
};
