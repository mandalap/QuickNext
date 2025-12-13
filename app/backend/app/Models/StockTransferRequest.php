<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'from_outlet_id',
        'to_outlet_id',
        'product_id',
        'quantity',
        'status',
        'reason',
        'rejection_reason',
        'requested_by',
        'approved_by',
        'requested_at',
        'approved_at',
        'completed_at',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the business that owns the request.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /**
     * Get the source outlet.
     */
    public function fromOutlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class, 'from_outlet_id');
    }

    /**
     * Get the destination outlet.
     */
    public function toOutlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class, 'to_outlet_id');
    }

    /**
     * Get the product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the user who requested the transfer.
     */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * Get the user who approved the transfer.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope a query to only include pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include approved requests.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope a query to filter by outlet.
     */
    public function scopeForOutlet($query, $outletId)
    {
        return $query->where(function ($q) use ($outletId) {
            $q->where('from_outlet_id', $outletId)
              ->orWhere('to_outlet_id', $outletId);
        });
    }
}
