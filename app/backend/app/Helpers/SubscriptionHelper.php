<?php

namespace App\Helpers;

use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class SubscriptionHelper
{
    /**
     * Get active subscription for user (owner or employee's business owner)
     */
    public static function getActiveSubscription(User $user): ?UserSubscription
    {
        // Employee roles need to check their business owner's subscription
        $isEmployeeRole = in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin']);

        if ($isEmployeeRole) {
            // Get employee's business and check owner's subscription
            $employee = Employee::where('user_id', $user->id)
                ->where('is_active', true)
                ->with(['business.owner'])
                ->first();

            if (!$employee || !$employee->business || !$employee->business->owner) {
                return null;
            }

            $owner = $employee->business->owner;
            
            // Cache key for owner subscription check (5 minutes cache)
            $cacheKey = "subscription:user:{$owner->id}";
            
            return Cache::remember($cacheKey, 300, function() use ($owner) {
                return UserSubscription::with(['subscriptionPlan'])
                    ->where('user_id', $owner->id)
                    ->where('status', 'active')
                    ->where('ends_at', '>', Carbon::now())
                    ->latest()
                    ->first();
            });
        }

        // For owner/super_admin roles, check their own subscription
        $cacheKey = "subscription:user:{$user->id}";
        
        return Cache::remember($cacheKey, 300, function() use ($user) {
            return UserSubscription::with(['subscriptionPlan'])
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->where('ends_at', '>', Carbon::now())
                ->latest()
                ->first();
        });
    }

    /**
     * Check if user has access to advanced reports
     * ✅ FIX: Check has_reports_access first (configurable from Filament), fallback to has_advanced_reports
     */
    public static function hasAdvancedReports(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        $plan = $subscription->subscriptionPlan;
        
        // ✅ NEW: Check has_reports_access first (configurable from Filament)
        // If has_reports_access is set, use it; otherwise fallback to has_advanced_reports for backward compatibility
        if (isset($plan->has_reports_access)) {
            return $plan->has_reports_access === true;
        }
        
        // Fallback to has_advanced_reports for backward compatibility
        return $plan->has_advanced_reports === true;
    }

    /**
     * Check if user has access to online integration
     */
    public static function hasOnlineIntegration(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_online_integration === true;
    }

    /**
     * Check if user has access to API
     */
    public static function hasApiAccess(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_api_access === true;
    }

    /**
     * Check if user has access to multi location
     */
    public static function hasMultiLocation(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_multi_location === true;
    }

    /**
     * Check if user has access to kitchen
     */
    public static function hasKitchenAccess(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_kitchen_access === true;
    }

    /**
     * Check if user has access to tables
     */
    public static function hasTablesAccess(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_tables_access === true;
    }

    /**
     * Check if user has access to attendance
     */
    public static function hasAttendanceAccess(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_attendance_access === true;
    }

    /**
     * Check if user has access to inventory
     */
    public static function hasInventoryAccess(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_inventory_access === true;
    }

    /**
     * Check if user has access to promo
     */
    public static function hasPromoAccess(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_promo_access === true;
    }

    /**
     * Check if user has access to stock transfer
     */
    public static function hasStockTransferAccess(User $user): bool
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return false;
        }

        return $subscription->subscriptionPlan->has_stock_transfer_access === true;
    }

    /**
     * Check if user has access to face recognition
     * Face recognition requires attendance access
     */
    public static function hasFaceRecognitionAccess(User $user): bool
    {
        // Face recognition is part of attendance feature
        return self::hasAttendanceAccess($user);
    }

    /**
     * Get subscription plan features
     */
    public static function getPlanFeatures(User $user): array
    {
        $subscription = self::getActiveSubscription($user);
        
        if (!$subscription || !$subscription->subscriptionPlan) {
            return [
                'has_advanced_reports' => false,
                'has_reports_access' => false,
                'has_kitchen_access' => false,
                'has_tables_access' => false,
                'has_attendance_access' => false,
                'has_inventory_access' => false,
                'has_promo_access' => false,
                'has_stock_transfer_access' => false,
                'has_self_service_access' => false,
                'has_online_integration' => false,
                'has_api_access' => false,
                'has_multi_location' => false,
            ];
        }

        $plan = $subscription->subscriptionPlan;
        
        // Check has_reports_access first, fallback to has_advanced_reports
        $hasReportsAccess = isset($plan->has_reports_access) 
            ? $plan->has_reports_access 
            : ($plan->has_advanced_reports ?? false);
        
        return [
            'has_advanced_reports' => $hasReportsAccess,
            'has_reports_access' => $hasReportsAccess,
            'has_kitchen_access' => $plan->has_kitchen_access ?? false,
            'has_tables_access' => $plan->has_tables_access ?? false,
            'has_attendance_access' => $plan->has_attendance_access ?? false,
            'has_inventory_access' => $plan->has_inventory_access ?? false,
            'has_promo_access' => $plan->has_promo_access ?? false,
            'has_stock_transfer_access' => $plan->has_stock_transfer_access ?? false,
            'has_self_service_access' => $plan->has_self_service_access ?? false,
            'has_online_integration' => $plan->has_online_integration ?? false,
            'has_api_access' => $plan->has_api_access ?? false,
            'has_multi_location' => $plan->has_multi_location ?? false,
            'max_businesses' => $plan->max_businesses ?? 1,
            'max_outlets' => $plan->max_outlets ?? 1,
            'max_products' => $plan->max_products ?? 100,
            'max_employees' => $plan->max_employees ?? 5,
        ];
    }
}

