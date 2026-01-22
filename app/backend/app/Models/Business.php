<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Business extends Model
{
    //
    use SoftDeletes;
    protected $fillable = [
        'owner_id', 'business_type_id', 'current_subscription_id', 'name', 'slug', 'email',
        'phone', 'address', 'logo', 'tax_number', 'tax_rate',
        'currency', 'settings', 'midtrans_config', 'status', 'subscription_expires_at', 'subscription_info'
    ];

    protected $casts = [
        'settings' => 'array',
        'midtrans_config' => 'array',
        'tax_rate' => 'decimal:2',
        'subscription_expires_at' => 'datetime',
        'subscription_info' => 'array',
    ];

    // ✅ RELASI YANG SUDAH BENAR
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function businessType()
    {
        return $this->belongsTo(BusinessType::class);
    }

    public function currentSubscription()
    {
        return $this->belongsTo(UserSubscription::class, 'current_subscription_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'business_users')
                    ->withPivot('role', 'permissions', 'is_active', 'invited_at', 'joined_at')
                    ->withTimestamps();
    }

    // ✅ TAMBAHAN: Relasi yang hilang tapi penting
    public function outlets()
    {
        return $this->hasMany(Outlet::class);
    }

    public function categories()
    {
        return $this->hasMany(Category::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function discounts()
    {
        return $this->hasMany(Discount::class);
    }

    public function ingredients()
    {
        return $this->hasMany(Ingredient::class);
    }

    // ✅ Helper methods untuk validasi subscription limits
    // ✅ FIX: Limit outlet dihitung per OWNER (total dari semua bisnis), bukan per bisnis
    public function canCreateOutlet(): bool
    {
        if (!$this->currentSubscription || !$this->currentSubscription->isActive()) return false;

        $maxOutlets = $this->currentSubscription->subscriptionPlan->max_outlets ?? 1;
        if ($maxOutlets === -1) return true; // Unlimited

        // ✅ FIX: Hitung total outlet dari SEMUA bisnis owner, bukan hanya bisnis ini
        $ownerId = $this->owner_id;
        $totalOutlets = \App\Models\Outlet::whereHas('business', function($query) use ($ownerId) {
            $query->where('owner_id', $ownerId);
        })->count();
        
        return $totalOutlets < $maxOutlets;
    }

    public function canCreateProduct(): bool
    {
        if (!$this->currentSubscription || !$this->currentSubscription->isActive()) return false;

        $maxProducts = $this->currentSubscription->subscriptionPlan->max_products ?? 10;
        if ($maxProducts === -1) return true; // Unlimited

        $currentProducts = $this->products()->count();
        return $currentProducts < $maxProducts;
    }

    public function canCreateEmployee(): bool
    {
        if (!$this->currentSubscription || !$this->currentSubscription->isActive()) return false;

        $maxEmployees = $this->currentSubscription->subscriptionPlan->max_employees ?? 2;
        if ($maxEmployees === -1) return true; // Unlimited

        $currentEmployees = $this->employees()->count();
        return $currentEmployees < $maxEmployees;
    }

    public function getSubscriptionLimits(): array
    {
        if (!$this->currentSubscription || !$this->currentSubscription->subscriptionPlan) {
            // ✅ FIX: Hitung total outlet dari SEMUA bisnis owner, bukan hanya bisnis ini
            $ownerId = $this->owner_id;
            $totalOutlets = \App\Models\Outlet::whereHas('business', function($query) use ($ownerId) {
                $query->where('owner_id', $ownerId);
            })->count();
            
            return [
                'max_businesses' => 1,
                'max_outlets' => 1,
                'max_products' => 10,
                'max_employees' => 2,
                'current_businesses' => Business::where('owner_id', $this->owner_id)->count(),
                'current_outlets' => $totalOutlets,
                'current_products' => $this->products()->count(),
                'current_employees' => $this->employees()->count(),
                'is_over_limit' => false,
            ];
        }

        $plan = $this->currentSubscription->subscriptionPlan;
        $currentBusinesses = Business::where('owner_id', $this->owner_id)->count();
        // ✅ FIX: Hitung total outlet dari SEMUA bisnis owner, bukan hanya bisnis ini
        $ownerId = $this->owner_id;
        $currentOutlets = \App\Models\Outlet::whereHas('business', function($query) use ($ownerId) {
            $query->where('owner_id', $ownerId);
        })->count();
        $currentProducts = $this->products()->count();
        $currentEmployees = $this->employees()->count();

        // Check if current usage exceeds limits (happens after downgrade)
        $isOverLimitBusinesses = $plan->max_businesses !== null && $plan->max_businesses !== -1 && $currentBusinesses > $plan->max_businesses;
        $isOverLimitOutlets = $plan->max_outlets !== -1 && $currentOutlets > $plan->max_outlets;
        $isOverLimitProducts = $plan->max_products !== -1 && $currentProducts > $plan->max_products;
        $isOverLimitEmployees = $plan->max_employees !== -1 && $currentEmployees > $plan->max_employees;

        return [
            'max_businesses' => $plan->max_businesses ?? 1,
            'max_outlets' => $plan->max_outlets,
            'max_products' => $plan->max_products,
            'max_employees' => $plan->max_employees,
            'current_businesses' => $currentBusinesses,
            'current_outlets' => $currentOutlets,
            'current_products' => $currentProducts,
            'current_employees' => $currentEmployees,
            'can_create_outlet' => $this->canCreateOutlet(),
            'can_create_product' => $this->canCreateProduct(),
            'can_create_employee' => $this->canCreateEmployee(),
            'is_over_limit' => $isOverLimitOutlets || $isOverLimitProducts || $isOverLimitEmployees,
            'over_limit_details' => [
                'outlets' => $isOverLimitOutlets ? [
                    'current' => $currentOutlets,
                    'max' => $plan->max_outlets,
                    'exceeded_by' => $currentOutlets - $plan->max_outlets,
                ] : null,
                'products' => $isOverLimitProducts ? [
                    'current' => $currentProducts,
                    'max' => $plan->max_products,
                    'exceeded_by' => $currentProducts - $plan->max_products,
                ] : null,
                'employees' => $isOverLimitEmployees ? [
                    'current' => $currentEmployees,
                    'max' => $plan->max_employees,
                    'exceeded_by' => $currentEmployees - $plan->max_employees,
                ] : null,
            ],
        ];
    }

    /**
     * Check if business can downgrade to a specific plan
     */
    public function canDowngradeTo(SubscriptionPlan $targetPlan): array
    {
        $currentOutlets = $this->outlets()->count();
        $currentProducts = $this->products()->count();
        $currentEmployees = $this->employees()->count();

        $issues = [];

        // Check outlets
        if ($targetPlan->max_outlets !== -1 && $currentOutlets > $targetPlan->max_outlets) {
            $issues[] = [
                'type' => 'outlets',
                'message' => "Anda memiliki {$currentOutlets} outlet, tetapi paket {$targetPlan->name} hanya mengizinkan {$targetPlan->max_outlets} outlet.",
                'current' => $currentOutlets,
                'max' => $targetPlan->max_outlets,
                'action_required' => "Hapus atau nonaktifkan " . ($currentOutlets - $targetPlan->max_outlets) . " outlet sebelum downgrade.",
            ];
        }

        // Check products
        if ($targetPlan->max_products !== -1 && $currentProducts > $targetPlan->max_products) {
            $issues[] = [
                'type' => 'products',
                'message' => "Anda memiliki {$currentProducts} produk, tetapi paket {$targetPlan->name} hanya mengizinkan {$targetPlan->max_products} produk.",
                'current' => $currentProducts,
                'max' => $targetPlan->max_products,
                'action_required' => "Hapus " . ($currentProducts - $targetPlan->max_products) . " produk sebelum downgrade.",
            ];
        }

        // Check employees
        if ($targetPlan->max_employees !== -1 && $currentEmployees > $targetPlan->max_employees) {
            $issues[] = [
                'type' => 'employees',
                'message' => "Anda memiliki {$currentEmployees} karyawan, tetapi paket {$targetPlan->name} hanya mengizinkan {$targetPlan->max_employees} karyawan.",
                'current' => $currentEmployees,
                'max' => $targetPlan->max_employees,
                'action_required' => "Hapus atau nonaktifkan " . ($currentEmployees - $targetPlan->max_employees) . " karyawan sebelum downgrade.",
            ];
        }

        return [
            'can_downgrade' => empty($issues),
            'issues' => $issues,
        ];
    }

    /**
     * Get Midtrans configuration for this business
     * Returns business-specific config if available, otherwise falls back to global config
     *
     * @return array
     */
    public function getMidtransConfig(): array
    {
        // Jika business punya config sendiri dan server_key + client_key tidak kosong, pakai itu
        // Semua field harus dari business config (tidak fallback ke global untuk field individual)
        if ($this->midtrans_config 
            && !empty($this->midtrans_config['server_key']) 
            && !empty($this->midtrans_config['client_key'])) {
            return [
                'server_key' => $this->midtrans_config['server_key'],
                'client_key' => $this->midtrans_config['client_key'],
                'is_production' => $this->midtrans_config['is_production'] ?? false,
                'is_sanitized' => $this->midtrans_config['is_sanitized'] ?? true,
                'is_3ds' => $this->midtrans_config['is_3ds'] ?? true,
            ];
        }

        // Fallback ke global config hanya jika business tidak punya config lengkap
        return [
            'server_key' => config('midtrans.server_key'),
            'client_key' => config('midtrans.client_key'),
            'is_production' => config('midtrans.is_production', false),
            'is_sanitized' => config('midtrans.is_sanitized', true),
            'is_3ds' => config('midtrans.is_3ds', true),
        ];
    }

    /**
     * Check if business has custom Midtrans configuration
     *
     * @return bool
     */
    public function hasCustomMidtransConfig(): bool
    {
        return $this->midtrans_config 
            && !empty($this->midtrans_config['server_key']) 
            && !empty($this->midtrans_config['client_key']);
    }
}
