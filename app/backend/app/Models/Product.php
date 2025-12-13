<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    //
    use SoftDeletes;

    protected $fillable = [
        'business_id', 'category_id', 'name', 'slug', 'sku',
        'description', 'image', 'price', 'cost', 'stock',
        'min_stock', 'stock_type', 'is_active', 'has_variants', 'tax_ids',
        'discount_price', 'discount_percentage', 'discount_start_date', 'discount_end_date'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_start_date' => 'datetime',
        'discount_end_date' => 'datetime',
        'is_active' => 'boolean',
        'has_variants' => 'boolean',
        'tax_ids' => 'array',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function recipes()
    {
        return $this->hasMany(Recipe::class);
    }

    public function ingredients()
    {
        return $this->belongsToMany(Ingredient::class, 'recipes')
                    ->withPivot('quantity')
                    ->withTimestamps();
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    /**
     * Check apakah diskon sedang aktif
     */
    public function hasActiveDiscount()
    {
        if (!$this->discount_price && !$this->discount_percentage) {
            return false;
        }

        $now = now();

        // Jika ada start date dan belum dimulai
        if ($this->discount_start_date && $now->lt($this->discount_start_date)) {
            return false;
        }

        // Jika ada end date dan sudah lewat
        if ($this->discount_end_date && $now->gt($this->discount_end_date)) {
            return false;
        }

        return true;
    }

    /**
     * Get harga final (dengan diskon jika aktif)
     */
    public function getFinalPriceAttribute()
    {
        if (!$this->hasActiveDiscount()) {
            return $this->price;
        }

        // Jika ada discount_price, gunakan itu
        if ($this->discount_price) {
            return $this->discount_price;
        }

        // Jika ada discount_percentage, hitung dari price
        if ($this->discount_percentage) {
            return $this->price * (1 - ($this->discount_percentage / 100));
        }

        return $this->price;
    }

    /**
     * Get jumlah penghematan diskon
     */
    public function getDiscountAmountAttribute()
    {
        if (!$this->hasActiveDiscount()) {
            return 0;
        }

        return $this->price - $this->final_price;
    }
}
