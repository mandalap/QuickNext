<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductOutlet extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'outlet_id',
        'stock',
        'min_stock',
        'price_override',
        'is_available',
    ];

    protected $casts = [
        'stock' => 'integer',
        'min_stock' => 'integer',
        'price_override' => 'decimal:2',
        'is_available' => 'boolean',
    ];

    /**
     * Get the product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the outlet.
     */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    /**
     * Check if stock is low.
     */
    public function isLowStock(): bool
    {
        return $this->stock <= $this->min_stock;
    }

    /**
     * Scope for low stock products.
     */
    public function scopeLowStock($query)
    {
        return $query->whereColumn('stock', '<=', 'min_stock');
    }

    /**
     * Scope for available products.
     */
    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }
}
