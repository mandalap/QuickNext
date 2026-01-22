<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformOrder extends Model
{
    protected $fillable = [
        'order_id', 'platform_id', 'platform_order_id',
        'platform_fee', 'commission_amount', 'platform_data'
    ];

    protected $casts = [
        'platform_fee' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'platform_data' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function platform()
    {
        return $this->belongsTo(OnlinePlatform::class, 'platform_id');
    }
}
