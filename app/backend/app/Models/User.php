<?php

namespace App\Models;

use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name', 'email', 'google_id', 'password', 'role', 'phone',
        'address', 'avatar', 'is_active', 'last_login_at', 'whatsapp_verified_at',
        'face_descriptor', 'face_registered'
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'whatsapp_verified_at' => 'datetime', // ✅ FIX: Add whatsapp_verified_at to casts
        'is_active' => 'boolean',
        'face_registered' => 'boolean',
        'face_descriptor' => 'array',
    ];

    /**
     * Determine if the user has verified their email address.
     */
    public function hasVerifiedEmail(): bool
    {
        return !is_null($this->email_verified_at);
    }

    /**
     * Mark the given user's email as verified.
     */
    public function markEmailAsVerified(): bool
    {
        return $this->forceFill([
            'email_verified_at' => $this->freshTimestamp(),
        ])->save();
    }

    // ✅ RELASI YANG SUDAH BENAR
    public function ownedBusinesses()
    {
        return $this->hasMany(Business::class, 'owner_id');
    }

    public function businesses()
    {
        return $this->belongsToMany(Business::class, 'business_users')
                    ->withPivot('role', 'permissions', 'is_active', 'invited_at', 'joined_at')
                    ->withTimestamps();
    }

    public function subscriptions()
    {
        return $this->hasMany(UserSubscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(UserSubscription::class)
                    ->where('status', 'active')
                    ->where('ends_at', '>', now());
    }

    // ❌ MASALAH: Employee relasi salah - User bisa punya banyak employee di berbagai business
    // public function employee()
    // {
    //     return $this->hasOne(Employee::class);
    // }

    // ✅ PERBAIKAN: User bisa jadi employee di banyak business
    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    // ✅ TAMBAHAN: Relasi yang hilang
    public function customerProfiles()
    {
        return $this->hasMany(Customer::class, 'user_id'); // Jika customer bisa linked ke user
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'employee_id');
    }

    // Employee outlet assignments
    public function outlets()
    {
        return $this->belongsToMany(Outlet::class, 'employee_outlets')
                    ->withPivot('business_id', 'is_primary')
                    ->withTimestamps();
    }

    // Get primary outlet for a specific business
    public function primaryOutlet($businessId = null)
    {
        $query = $this->outlets()->wherePivot('is_primary', true);
        if ($businessId) {
            $query->wherePivot('business_id', $businessId);
        }
        return $query->first();
    }

    // Check if user has access to a specific outlet
    public function hasAccessToOutlet($outletId)
    {
        return $this->outlets()->where('outlet_id', $outletId)->exists();
    }

    /**
     * Determine if the user can access the Filament admin panel.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        // Only allow admin and super_admin to access the admin panel
        return in_array($this->role, ['admin', 'super_admin']) && $this->is_active;
    }
}
