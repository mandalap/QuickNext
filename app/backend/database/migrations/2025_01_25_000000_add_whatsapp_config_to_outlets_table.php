<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds WhatsApp configuration to outlets table.
     * This allows each outlet to have their own WhatsApp API key and provider.
     */
    public function up(): void
    {
        // Check if outlets table exists before altering
        if (!Schema::hasTable('outlets')) {
            return;
        }

        Schema::table('outlets', function (Blueprint $table) {
            // Check if columns already exist before adding
            // Remove 'after' clause to avoid errors if referenced column doesn't exist
            if (!Schema::hasColumn('outlets', 'whatsapp_provider')) {
                $table->string('whatsapp_provider', 50)->nullable()->comment('WhatsApp provider: fonnte, wablas, kirimwa, wablitz');
            }
            if (!Schema::hasColumn('outlets', 'whatsapp_api_key')) {
                $table->text('whatsapp_api_key')->nullable()->comment('Encrypted WhatsApp API key');
            }
            if (!Schema::hasColumn('outlets', 'whatsapp_phone_number')) {
                $table->string('whatsapp_phone_number', 20)->nullable()->comment('WhatsApp phone number (sender number)');
            }
            if (!Schema::hasColumn('outlets', 'whatsapp_enabled')) {
                $table->boolean('whatsapp_enabled')->default(false)->comment('Enable WhatsApp notifications for this outlet');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_provider', 'whatsapp_api_key', 'whatsapp_phone_number', 'whatsapp_enabled']);
        });
    }
};

