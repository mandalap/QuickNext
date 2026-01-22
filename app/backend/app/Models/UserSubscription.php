<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class UserSubscription extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'subscription_plan_id',
        'subscription_plan_price_id',
        'subscription_code',
        'status',
        'amount_paid',
        'starts_at',
        'ends_at',
        'trial_ends_at',
        'is_trial',
        'plan_features',
        'notes',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'is_trial' => 'boolean',
        'plan_features' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subscriptionPlan()
    {
        return $this->belongsTo(SubscriptionPlan::class);
    }

    public function subscriptionPlanPrice()
    {
        return $this->belongsTo(SubscriptionPlanPrice::class, 'subscription_plan_price_id');
    }

    public function subscriptionPayments()
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    // Helper method to check if subscription is active
    public function isActive(): bool
    {
        if (!$this->ends_at) return false;
        return $this->status === 'active' && $this->ends_at > Carbon::now();
    }

    // Helper method to check if trial has ended
    public function isTrialEnded(): bool
    {
        if (!$this->is_trial) return false;
        if (!$this->trial_ends_at) return false;
        return $this->trial_ends_at < Carbon::now();
    }

    // Helper method to get days remaining
    public function daysRemaining(): float
    {
        // ✅ FIX: Don't calculate days remaining if subscription is not active
        // Subscription with pending_payment status should not show days remaining
        if ($this->status !== 'active') return 0;
        if (!$this->ends_at) return 0;
        if ($this->ends_at < Carbon::now()) return 0;
        $days = Carbon::now()->diffInDays($this->ends_at, false);
        // Round to 1 decimal place for better display
        return round($days, 1);
    }
}
