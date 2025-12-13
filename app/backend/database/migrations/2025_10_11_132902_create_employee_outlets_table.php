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
        Schema::create('employee_outlets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('outlet_id')->constrained('outlets')->onDelete('cascade');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->boolean('is_primary')->default(false); // Primary outlet for employee
            $table->timestamps();

            // Unique constraint - one user per outlet
            $table->unique(['user_id', 'outlet_id']);

            // Indexes for performance
            $table->index(['user_id', 'business_id']);
            $table->index(['outlet_id', 'business_id']);
        });

        // Assign all existing users to all outlets in their business (for backward compatibility)
        DB::statement("
            INSERT INTO employee_outlets (user_id, outlet_id, business_id, is_primary, created_at, updated_at)
            SELECT
                bu.user_id,
                o.id as outlet_id,
                bu.business_id,
                0 as is_primary,
                NOW() as created_at,
                NOW() as updated_at
            FROM business_users bu
            INNER JOIN outlets o ON bu.business_id = o.business_id
            WHERE bu.is_active = 1
            AND NOT EXISTS (
                SELECT 1 FROM employee_outlets eo
                WHERE eo.user_id = bu.user_id AND eo.outlet_id = o.id
            )
        ");

        // Set first outlet as primary for each user in each business
        DB::statement("
            UPDATE employee_outlets eo
            INNER JOIN (
                SELECT user_id, business_id, MIN(outlet_id) as first_outlet_id
                FROM employee_outlets
                GROUP BY user_id, business_id
            ) first ON eo.user_id = first.user_id
                AND eo.business_id = first.business_id
                AND eo.outlet_id = first.first_outlet_id
            SET eo.is_primary = 1
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_outlets');
    }
};
