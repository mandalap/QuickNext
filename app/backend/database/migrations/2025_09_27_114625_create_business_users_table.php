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
        Schema::create('business_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('role', ['admin', 'kasir', 'kitchen', 'waiter'])->default('kasir');
            $table->json('permissions')->nullable(); // Specific permissions
            $table->boolean('is_active')->default(true);
            $table->datetime('invited_at')->nullable();
            $table->datetime('joined_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['business_id', 'user_id']);

            // Indexes for performance
            $table->index('business_id');
            $table->index(['business_id', 'is_active']);
            $table->index(['user_id', 'is_active']);
            $table->index(['business_id', 'role', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('business_users');
    }
};
