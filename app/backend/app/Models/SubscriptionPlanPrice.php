<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionPlanPrice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'subscription_plan_id', 'duration_type', 'duration_months',
        'price', 'discount_percentage', 'final_price', 'is_active'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'final_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function subscriptionPlan()
    {
        return $this->belongsTo(SubscriptionPlan::class);
    }
}
