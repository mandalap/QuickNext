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
        Schema::create('whatsapp_api_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('Nama konfigurasi');
            $table->text('description')->nullable()->comment('Deskripsi konfigurasi');
            $table->string('provider')->default('wablitz')->comment('Provider: wablitz, fonnte, wablas, kirimwa');
            $table->string('api_token')->comment('API Key / Token');
            $table->string('sender')->comment('Nomor pengirim (format: 62xxxxxxxxxx)');
            $table->string('url')->comment('URL endpoint untuk mengirim pesan');
            $table->enum('status', ['active', 'inactive'])->default('inactive')->comment('Status konfigurasi');
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('provider');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_api_tokens');
    }
};
