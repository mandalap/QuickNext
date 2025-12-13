<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tax extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'business_id',
        'outlet_id',
        'type',
        'description',
        'rate',
        'base',
        'amount',
        'due_date',
        'period_start',
        'period_end',
        'period',
        'status',
        'notes',
        'paid_at',
        'payment_reference',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
        'base' => 'decimal:2',
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'period_start' => 'date',
        'period_end' => 'date',
        'paid_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function outlet()
    {
        return $this->belongsTo(Outlet::class);
    }

    /**
     * Check if tax is overdue
     */
    public function getIsOverdueAttribute()
    {
        return $this->status === 'pending' && $this->due_date < now()->toDateString();
    }

    /**
     * Calculate amount from base and rate
     */
    public function calculateAmount()
    {
        return ($this->base * $this->rate) / 100;
    }
}
