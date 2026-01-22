<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class WhatsappVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone',
        'code',
        'verified_at',
        'expires_at',
        'attempts',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'expires_at' => 'datetime',
        'attempts' => 'integer',
    ];

    /**
     * Generate random 6-digit OTP code
     */
    public static function generateCode(): string
    {
        return str_pad((string) rand(100000, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create or update verification code for phone
     */
    public static function createOrUpdateCode(string $phone): self
    {
        // Delete old unverified codes for this phone
        static::where('phone', $phone)
            ->whereNull('verified_at')
            ->delete();

        $code = static::generateCode();
        $expiresAt = Carbon::now()->addMinutes(10); // OTP valid for 10 minutes

        return static::create([
            'phone' => $phone,
            'code' => $code,
            'expires_at' => $expiresAt,
            'attempts' => 0,
        ]);
    }

    /**
     * Verify code
     */
    public static function verifyCode(string $phone, string $code): bool
    {
        $verification = static::where('phone', $phone)
            ->where('code', $code)
            ->whereNull('verified_at')
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$verification) {
            return false;
        }

        // Increment attempts
        $verification->increment('attempts');

        // Check max attempts (5 attempts)
        if ($verification->attempts > 5) {
            $verification->delete();
            return false;
        }

        // Mark as verified
        $verification->update([
            'verified_at' => Carbon::now(),
        ]);

        return true;
    }

    /**
     * Check if phone is verified (has verified code in last 24 hours)
     */
    public static function isPhoneVerified(string $phone): bool
    {
        return static::where('phone', $phone)
            ->whereNotNull('verified_at')
            ->where('verified_at', '>', Carbon::now()->subHours(24))
            ->exists();
    }

    /**
     * Clean up expired codes (run via scheduled task)
     */
    public static function cleanupExpired(): void
    {
        static::where('expires_at', '<', Carbon::now())
            ->whereNull('verified_at')
            ->delete();
    }
}
