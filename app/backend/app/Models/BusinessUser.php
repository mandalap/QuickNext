<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BusinessUser extends Model
{
    //

    use SoftDeletes; // ✅ TAMBAHAN: Soft delete

    protected $fillable = [
        'business_id', 'user_id', 'role', 'permissions',
        'is_active', 'invited_at', 'joined_at'
    ];

    protected $casts = [
        'permissions' => 'array',
        'is_active' => 'boolean',
        'invited_at' => 'datetime',
        'joined_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ✅ HELPER METHOD
    public function hasPermission(string $permission): bool
    {
        if (!$this->is_active) return false;

        $permissions = $this->permissions ?? [];
        return in_array($permission, $permissions);
    }
}
