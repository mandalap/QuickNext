<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ingredient extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'business_id', 'name', 'unit', 'cost_per_unit',
        'current_stock', 'min_stock', 'category', 'supplier', 'expiry_date'
    ];

    protected $casts = [
        'cost_per_unit' => 'decimal:2',
        'current_stock' => 'decimal:2',
        'min_stock' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'recipes')
                    ->withPivot('quantity');
    }

}
