<?php

namespace App\Events;

use App\Models\SubscriptionPayment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SubscriptionPaid
{
    use Dispatchable, SerializesModels;

    public SubscriptionPayment $payment;

    /**
     * Create a new event instance.
     */
    public function __construct(SubscriptionPayment $payment)
    {
        $this->payment = $payment;
    }
}

