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
        Schema::create('outlet_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outlet_id')->constrained('outlets')->onDelete('cascade');
            $table->string('setting_key');
            $table->text('setting_value');
            $table->string('data_type')->default('string'); // string, integer, boolean, json
            $table->text('description')->nullable();
            $table->timestamps();

            // Unique constraint - one setting per outlet
            $table->unique(['outlet_id', 'setting_key']);

            // Index for performance
            $table->index('outlet_id');
        });

        // Insert default settings for existing outlets
        DB::statement("
            INSERT INTO outlet_settings (outlet_id, setting_key, setting_value, data_type, description, created_at, updated_at)
            SELECT
                id as outlet_id,
                'operating_hours' as setting_key,
                '{\"monday\":{\"open\":\"08:00\",\"close\":\"20:00\",\"is_open\":true},\"tuesday\":{\"open\":\"08:00\",\"close\":\"20:00\",\"is_open\":true},\"wednesday\":{\"open\":\"08:00\",\"close\":\"20:00\",\"is_open\":true},\"thursday\":{\"open\":\"08:00\",\"close\":\"20:00\",\"is_open\":true},\"friday\":{\"open\":\"08:00\",\"close\":\"20:00\",\"is_open\":true},\"saturday\":{\"open\":\"08:00\",\"close\":\"20:00\",\"is_open\":true},\"sunday\":{\"open\":\"08:00\",\"close\":\"20:00\",\"is_open\":true}}' as setting_value,
                'json' as data_type,
                'Operating hours for each day of the week' as description,
                NOW() as created_at,
                NOW() as updated_at
            FROM outlets
            WHERE NOT EXISTS (
                SELECT 1 FROM outlet_settings
                WHERE outlet_settings.outlet_id = outlets.id
                AND outlet_settings.setting_key = 'operating_hours'
            )
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('outlet_settings');
    }
};
