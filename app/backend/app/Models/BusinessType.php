<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessType extends Model
{
    protected $fillable = [
        'code', 'name', 'description', 'icon',
        'has_products', 'has_services', 'requires_stock',
        'requires_tables', 'requires_kitchen',
        'order_statuses', 'pricing_models', 'order_fields',
        'features', 'is_active', 'sort_order'
    ];

    protected $casts = [
        'has_products' => 'boolean',
        'has_services' => 'boolean',
        'requires_stock' => 'boolean',
        'requires_tables' => 'boolean',
        'requires_kitchen' => 'boolean',
        'order_statuses' => 'array',
        'pricing_models' => 'array',
        'order_fields' => 'array',
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get businesses of this type
     */
    public function businesses()
    {
        return $this->hasMany(Business::class);
    }

    /**
     * Get outlets of this type
     */
    public function outlets()
    {
        return $this->hasMany(Outlet::class);
    }

    /**
     * Get default order statuses for this business type
     */
    public function getDefaultOrderStatuses(): array
    {
        return $this->order_statuses ?? [
            'pending',
            'processing',
            'completed',
            'cancelled'
        ];
    }

    /**
     * Get available pricing models
     */
    public function getPricingModels(): array
    {
        return $this->pricing_models ?? ['per_unit'];
    }

    /**
     * Get available order fields
     */
    public function getOrderFields(): array
    {
        return $this->order_fields ?? [];
    }

    /**
     * Check if feature is enabled
     */
    public function hasFeature(string $feature): bool
    {
        $features = $this->features ?? [];
        return in_array($feature, $features);
    }
}
