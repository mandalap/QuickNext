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
        // Insert default setting for existing outlets
        DB::statement("
            INSERT INTO outlet_settings (outlet_id, setting_key, setting_value, data_type, description, created_at, updated_at)
            SELECT
                id as outlet_id,
                'send_receipt_via_wa' as setting_key,
                'false' as setting_value,
                'boolean' as data_type,
                'Enable/disable sending receipt via WhatsApp when payment is completed' as description,
                NOW() as created_at,
                NOW() as updated_at
            FROM outlets
            WHERE NOT EXISTS (
                SELECT 1 FROM outlet_settings
                WHERE outlet_settings.outlet_id = outlets.id
                AND outlet_settings.setting_key = 'send_receipt_via_wa'
            )
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the setting
        DB::table('outlet_settings')
            ->where('setting_key', 'send_receipt_via_wa')
            ->delete();
    }
};
