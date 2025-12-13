<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WhatsappApiToken extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'provider',
        'api_token',
        'sender',
        'url',
        'status',
        'description',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    // Don't hide api_token from JSON, but we'll use accessor/mutator if needed

    /**
     * Get active token
     */
    public static function getActive()
    {
        return static::where('status', 'active')->first();
    }

    /**
     * Scope for active tokens
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}

