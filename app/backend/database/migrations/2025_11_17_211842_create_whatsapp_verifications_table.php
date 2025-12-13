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
        Schema::create('whatsapp_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->index()->comment('Nomor WhatsApp (format: 62xxxxxxxxxx)');
            $table->string('code', 6)->comment('Kode OTP 6 digit');
            $table->timestamp('verified_at')->nullable()->comment('Waktu verifikasi berhasil');
            $table->timestamp('expires_at')->comment('Waktu kadaluarsa OTP');
            $table->integer('attempts')->default(0)->comment('Jumlah percobaan verifikasi');
            $table->timestamps();

            $table->index(['phone', 'code']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_verifications');
    }
};
