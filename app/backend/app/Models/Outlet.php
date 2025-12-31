<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Outlet extends Model
{
    //
    use SoftDeletes;

    protected $fillable = [
        'business_id', 'business_type_id', 'name', 'code', 'slug', 'address',
        'description', 'phone', 'logo', 'cover_image', 'is_active', 'is_public', 'tax_rate',
        'payment_gateway_config', 'whatsapp_provider', 'whatsapp_api_key', 'whatsapp_phone_number', 'whatsapp_enabled',
        'self_service_enabled',
        'latitude', 'longitude', 'attendance_radius', 'attendance_face_id_required', 'attendance_gps_required',
        'shift_pagi_start', 'shift_pagi_end',
        'shift_siang_start', 'shift_siang_end',
        'shift_malam_start', 'shift_malam_end',
        'working_days'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'tax_rate' => 'decimal:2',
        'payment_gateway_config' => 'array',
        'whatsapp_enabled' => 'boolean',
        'self_service_enabled' => 'boolean',
        'attendance_face_id_required' => 'boolean',
        'attendance_gps_required' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'attendance_radius' => 'integer',
        'working_days' => 'array', // ✅ NEW: Array of working days (1=Monday, 2=Tuesday, ..., 0=Sunday)
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function tables()
    {
        return $this->hasMany(Table::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Get business type relationship
     * Outlet can have its own business type or inherit from parent business
     */
    public function businessType()
    {
        return $this->belongsTo(BusinessType::class);
    }

    /**
     * Get business type - prefer outlet's own type, fallback to business type
     */
    public function getBusinessTypeAttribute()
    {
        // If outlet has its own business type, use it
        if ($this->business_type_id && $this->relationLoaded('businessType')) {
            return $this->businessType;
        }

        // Otherwise, inherit from parent business
        return $this->business->businessType ?? null;
    }

    /**
     * Check if outlet requires stock management
     * Stock is always required for all business types
     */
    public function requiresStock()
    {
        // Stock is always required for all business types including laundry
        return true;
    }

    /**
     * Check if outlet supports products
     */
    public function supportsProducts()
    {
        $businessType = $this->getBusinessTypeAttribute();

        if (!$businessType) {
            return true; // Default to supporting products
        }

        return $businessType->has_products ?? true;
    }

    /**
     * Check if outlet supports services
     */
    public function supportsServices()
    {
        $businessType = $this->getBusinessTypeAttribute();

        if (!$businessType) {
            return false; // Default to not supporting services
        }

        return $businessType->has_services ?? false;
    }

    /**
     * Get effective tax rate for this outlet
     * Returns outlet's tax_rate if set, otherwise inherits from business
     */
    public function getEffectiveTaxRate()
    {
        // If outlet has its own tax rate, use it
        if ($this->tax_rate !== null) {
            return (float) $this->tax_rate;
        }

        // Otherwise, inherit from business
        if ($this->business && $this->business->tax_rate !== null) {
            return (float) $this->business->tax_rate;
        }

        // Default to 0
        return 0.0;
    }

    /**
     * Get Midtrans configuration for this outlet
     * Priority: Outlet config -> Business config -> Global config
     *
     * @return array
     */
    public function getMidtransConfig(): array
    {
        // 1. Check outlet's payment_gateway_config first
        if ($this->payment_gateway_config && isset($this->payment_gateway_config['midtrans'])) {
            $outletConfig = $this->payment_gateway_config['midtrans'];
            
            \Log::info('Outlet getMidtransConfig: Checking outlet config', [
                'outlet_id' => $this->id,
                'outlet_name' => $this->name,
                'has_payment_gateway_config' => !empty($this->payment_gateway_config),
                'has_midtrans_config' => isset($this->payment_gateway_config['midtrans']),
                'enabled' => $outletConfig['enabled'] ?? false,
            ]);
            
            // Check if outlet config is enabled and has required keys
            if (isset($outletConfig['enabled']) && $outletConfig['enabled'] === true) {
                // Decrypt server_key if encrypted
                $serverKey = $outletConfig['server_key'] ?? '';
                if (strpos($serverKey, 'eyJpdiI6') === 0) {
                    // Looks like encrypted, try to decrypt
                    try {
                        $serverKey = decrypt($serverKey);
                        \Log::info('Outlet getMidtransConfig: Server key decrypted successfully');
                    } catch (\Exception $e) {
                        \Log::warning('Outlet getMidtransConfig: Failed to decrypt server_key', [
                            'error' => $e->getMessage(),
                        ]);
                        // If decryption fails, use as is (might be plain text)
                    }
                }
                
                $clientKey = $outletConfig['client_key'] ?? '';
                
                \Log::info('Outlet getMidtransConfig: Validating keys', [
                    'has_server_key' => !empty($serverKey),
                    'has_client_key' => !empty($clientKey),
                    'server_key_prefix' => substr($serverKey, 0, 15),
                    'client_key_prefix' => substr($clientKey, 0, 15),
                ]);
                
                if (!empty($serverKey) && !empty($clientKey)) {
                    \Log::info('Outlet getMidtransConfig: Using outlet custom config');
                    return [
                        'server_key' => $serverKey,
                        'client_key' => $clientKey,
                        'is_production' => $outletConfig['is_production'] ?? false,
                        'is_sanitized' => $outletConfig['is_sanitized'] ?? true,
                        'is_3ds' => $outletConfig['is_3ds'] ?? true,
                    ];
                } else {
                    \Log::warning('Outlet getMidtransConfig: Outlet config enabled but keys are empty');
                }
            } else {
                \Log::info('Outlet getMidtransConfig: Outlet config not enabled');
            }
        } else {
            \Log::info('Outlet getMidtransConfig: No outlet payment_gateway_config found');
        }

        // 2. Fallback to business config
        if ($this->business && $this->business->hasCustomMidtransConfig()) {
            return $this->business->getMidtransConfig();
        }

        // 3. Fallback to global config
        return [
            'server_key' => config('midtrans.server_key'),
            'client_key' => config('midtrans.client_key'),
            'is_production' => config('midtrans.is_production', false),
            'is_sanitized' => config('midtrans.is_sanitized', true),
            'is_3ds' => config('midtrans.is_3ds', true),
        ];
    }

    /**
     * Check if outlet has custom Midtrans configuration
     *
     * @return bool
     */
    public function hasCustomMidtransConfig(): bool
    {
        if ($this->payment_gateway_config && isset($this->payment_gateway_config['midtrans'])) {
            $outletConfig = $this->payment_gateway_config['midtrans'];
            
            if (isset($outletConfig['enabled']) && $outletConfig['enabled'] === true) {
                $serverKey = $outletConfig['server_key'] ?? '';
                $clientKey = $outletConfig['client_key'] ?? '';
                
                // Try to decrypt server_key if encrypted
                if (strpos($serverKey, 'eyJpdiI6') === 0) {
                    try {
                        $serverKey = decrypt($serverKey);
                    } catch (\Exception $e) {
                        // If decryption fails, use as is
                    }
                }
                
                return !empty($serverKey) && !empty($clientKey);
            }
        }
        
        return false;
    }

    /**
     * Get outlet setting value
     */
    public function getSetting($key, $default = null)
    {
        $setting = \App\Models\OutletSetting::where('outlet_id', $this->id)
            ->where('setting_key', $key)
            ->first();
        
        if (!$setting) {
            return $default;
        }
        
        return $setting->getValueAttribute();
    }

    /**
     * Check if sending receipt via WA is enabled
     */
    public function isSendReceiptViaWAEnabled()
    {
        return $this->getSetting('send_receipt_via_wa', false) === true;
    }
}
