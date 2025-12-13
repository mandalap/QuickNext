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
        Schema::table('outlets', function (Blueprint $table) {
            $table->foreignId('business_type_id')->nullable()->after('business_id')->constrained('business_types')->onDelete('set null');
            $table->index('business_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->dropForeign(['business_type_id']);
            $table->dropIndex(['business_type_id']);
            $table->dropColumn('business_type_id');
        });
    }
};
