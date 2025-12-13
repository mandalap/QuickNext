<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Run the migrations.
     * Add foreign key constraint to business_id after businesses table is created
     */
    public function up(): void
    {
        // ✅ FIX: Add foreign key constraint only if both tables exist
        if (Schema::hasTable('push_subscriptions') && Schema::hasTable('businesses')) {
            // Check if foreign key already exists
            try {
                $foreignKeys = Schema::getConnection()
                    ->getDoctrineSchemaManager()
                    ->listTableForeignKeys('push_subscriptions');
                
                $hasBusinessForeignKey = false;
                foreach ($foreignKeys as $foreignKey) {
                    if ($foreignKey->getForeignTableName() === 'businesses') {
                        $hasBusinessForeignKey = true;
                        break;
                    }
                }
                
                // Add foreign key only if it doesn't exist
                if (!$hasBusinessForeignKey) {
                    Schema::table('push_subscriptions', function (Blueprint $table) {
                        $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
                    });
                }
            } catch (\Exception $e) {
                // If error, try to add foreign key anyway (might not exist yet)
                Schema::table('push_subscriptions', function (Blueprint $table) {
                    $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('push_subscriptions')) {
            try {
                Schema::table('push_subscriptions', function (Blueprint $table) {
                    $table->dropForeign(['business_id']);
                });
            } catch (\Exception $e) {
                // Ignore if foreign key doesn't exist
            }
        }
    }
};
