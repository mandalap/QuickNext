<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OnlinePlatform extends Model
{
    protected $fillable = [
        'name', 'slug', 'commission_rate', 'api_config', 'is_active'
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
        'api_config' => 'array',
        'is_active' => 'boolean',
    ];

    public function platformOrders()
    {
        return $this->hasMany(PlatformOrder::class, 'platform_id');
    }
}
