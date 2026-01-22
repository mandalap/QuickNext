<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('processed_by_user_id')->nullable()->after('paid_at');
            $table->unsignedBigInteger('processed_by_employee_id')->nullable()->after('processed_by_user_id');

            $table->foreign('processed_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('processed_by_employee_id')->references('id')->on('employees')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['processed_by_user_id']);
            $table->dropForeign(['processed_by_employee_id']);
            $table->dropColumn(['processed_by_user_id', 'processed_by_employee_id']);
        });
    }
};
