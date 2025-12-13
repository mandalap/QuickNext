<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionPayment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_subscription_id', 'payment_code', 'amount', 'status',
        'payment_method', 'payment_gateway', 'gateway_payment_id',
        'payment_data', 'paid_at', 'expires_at', 'notes'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_data' => 'array',
        'paid_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function userSubscription()
    {
        return $this->belongsTo(UserSubscription::class);
    }

    public function user()
    {
        return $this->hasOneThrough(
            User::class,
            UserSubscription::class,
            'id', // Foreign key on user_subscriptions table
            'id', // Foreign key on users table
            'user_subscription_id', // Local key on subscription_payments table
            'user_id' // Local key on user_subscriptions table
        );
    }
}
