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
     * Ensures WhatsApp configuration columns exist in outlets table.
     * Uses raw SQL to avoid issues with 'after' clause.
     */
    public function up(): void
    {
        // Check if outlets table exists
        if (!Schema::hasTable('outlets')) {
            return;
        }

        // Add columns using raw SQL to avoid 'after' clause issues
        $columns = [
            [
                'name' => 'whatsapp_provider',
                'definition' => 'VARCHAR(50) NULL COMMENT "WhatsApp provider: fonnte, wablas, kirimwa, wablitz"'
            ],
            [
                'name' => 'whatsapp_api_key',
                'definition' => 'TEXT NULL COMMENT "Encrypted WhatsApp API key"'
            ],
            [
                'name' => 'whatsapp_phone_number',
                'definition' => 'VARCHAR(20) NULL COMMENT "WhatsApp phone number (sender number)"'
            ],
            [
                'name' => 'whatsapp_enabled',
                'definition' => 'TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Enable WhatsApp notifications for this outlet"'
            ]
        ];

        foreach ($columns as $column) {
            if (!Schema::hasColumn('outlets', $column['name'])) {
                try {
                    DB::statement("ALTER TABLE outlets ADD COLUMN {$column['name']} {$column['definition']}");
                } catch (\Exception $e) {
                    // Log error but continue
                    \Log::warning("Failed to add column {$column['name']}: " . $e->getMessage());
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('outlets')) {
            Schema::table('outlets', function (Blueprint $table) {
                if (Schema::hasColumn('outlets', 'whatsapp_provider')) {
                    $table->dropColumn('whatsapp_provider');
                }
                if (Schema::hasColumn('outlets', 'whatsapp_api_key')) {
                    $table->dropColumn('whatsapp_api_key');
                }
                if (Schema::hasColumn('outlets', 'whatsapp_phone_number')) {
                    $table->dropColumn('whatsapp_phone_number');
                }
                if (Schema::hasColumn('outlets', 'whatsapp_enabled')) {
                    $table->dropColumn('whatsapp_enabled');
                }
            });
        }
    }
};
