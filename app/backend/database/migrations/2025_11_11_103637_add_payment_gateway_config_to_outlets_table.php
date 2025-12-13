<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds payment gateway configuration to outlets table.
     * This allows each outlet to have their own Midtrans (or other gateway) credentials.
     */
    public function up(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            // JSON column to store payment gateway configurations
            // Structure: {
            //   "midtrans": {
            //     "server_key": "encrypted_server_key",
            //     "client_key": "client_key",
            //     "is_production": false,
            //     "enabled": true
            //   },
            //   "other_gateway": {...}
            // }
            $table->json('payment_gateway_config')->nullable()->after('is_public');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->dropColumn('payment_gateway_config');
        });
    }
};
