<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionPlan extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'description', 'max_outlets', 'max_products',
        'max_employees', 'max_businesses', 'has_online_integration', 'has_advanced_reports',
        'has_reports_access', 'has_kitchen_access', 'has_tables_access',
        'has_attendance_access', 'has_inventory_access', 'has_promo_access',
        'has_stock_transfer_access', 'has_self_service_access', 'has_api_access', 'has_multi_location', 
        'features', 'is_active', 'is_popular', 'cta_text', 'sort_order'
    ];

    protected $casts = [
        'has_online_integration' => 'boolean',
        'has_advanced_reports' => 'boolean',
        'has_reports_access' => 'boolean',
        'has_kitchen_access' => 'boolean',
        'has_tables_access' => 'boolean',
        'has_attendance_access' => 'boolean',
        'has_inventory_access' => 'boolean',
        'has_promo_access' => 'boolean',
        'has_stock_transfer_access' => 'boolean',
        'has_self_service_access' => 'boolean',
        'has_api_access' => 'boolean',
        'has_multi_location' => 'boolean',
        'is_active' => 'boolean',
        'is_popular' => 'boolean',
    ];

    // Accessor untuk mengkonversi features array string ke format Repeater
    public function getFeaturesAttribute($value)
    {
        // Jika null atau kosong, return array kosong
        if (empty($value)) {
            return [];
        }

        // Jika sudah array, langsung proses
        if (is_array($value)) {
            $features = $value;
        } else {
            // Decode JSON string
            $features = json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return [];
            }
        }

        // Jika bukan array, return kosong
        if (!is_array($features)) {
            return [];
        }

        // Jika sudah dalam format Repeater (array of objects dengan key 'feature'), return as is
        if (!empty($features) && isset($features[0]) && is_array($features[0]) && isset($features[0]['feature'])) {
            return $features;
        }

        // Konversi array string ke format Repeater (array of objects)
        return array_map(function ($feature) {
            if (is_array($feature)) {
                // Jika sudah object dengan key 'feature', return as is
                if (isset($feature['feature'])) {
                    return $feature;
                }
                // Jika array tapi tidak punya key 'feature', ambil nilai pertama atau stringify
                return ['feature' => $feature[0] ?? json_encode($feature)];
            }
            // Jika string, wrap dalam object dengan key 'feature'
            return ['feature' => (string) $feature];
        }, $features);
    }

    // Mutator untuk menyimpan features dalam format yang benar
    public function setFeaturesAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['features'] = json_encode([]);
            return;
        }

        if (is_array($value)) {
            // Jika format Repeater (array of objects dengan key 'feature'), extract hanya string features
            $features = array_map(function ($item) {
                if (is_array($item) && isset($item['feature'])) {
                    return $item['feature'];
                }
                // Jika array tapi tidak punya key 'feature', ambil nilai pertama
                if (is_array($item)) {
                    return $item[0] ?? json_encode($item);
                }
                return $item;
            }, $value);
            
            $this->attributes['features'] = json_encode(array_values($features));
        } else {
            $this->attributes['features'] = $value;
        }
    }

    public function subscriptionPlanPrices()
    {
        return $this->hasMany(SubscriptionPlanPrice::class);
    }

    public function prices()
    {
        return $this->hasMany(SubscriptionPlanPrice::class);
    }

    public function userSubscriptions()
    {
        return $this->hasMany(UserSubscription::class);
    }
}
