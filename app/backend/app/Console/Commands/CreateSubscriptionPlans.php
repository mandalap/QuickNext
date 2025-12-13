<?php

namespace App\Console\Commands;

use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanPrice;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class CreateSubscriptionPlans extends Command
{
    protected $signature = 'create:subscription-plans';
    protected $description = 'Create subscription plans and their prices';

    public function handle()
    {
        $this->info('Creating subscription plans...');

        // Create Trial Plan
        $trialPlan = SubscriptionPlan::firstOrCreate(
            ['slug' => 'trial-7-days'],
            [
                'name' => 'Trial 7 Hari',
                'description' => 'Paket trial gratis untuk mencoba semua fitur selama 7 hari',
                'features' => [
                    '1 Bisnis',
                    '1 Outlet',
                    '5 Karyawan',
                    '100 Produk',
                    'Laporan Dasar',
                    'Support Email'
                ],
                'is_active' => true,
                'is_trial' => true,
            ]
        );

        // Create Basic Plan
        $basicPlan = SubscriptionPlan::firstOrCreate(
            ['slug' => 'basic'],
            [
                'name' => 'Basic',
                'description' => 'Paket dasar untuk bisnis kecil dengan fitur lengkap',
                'features' => [
                    '1 Bisnis',
                    '2 Outlet',
                    '10 Karyawan',
                    '500 Produk',
                    'Laporan Lengkap',
                    'Support Email & Chat',
                    'Backup Data'
                ],
                'is_active' => true,
                'is_trial' => false,
            ]
        );

        // Create Professional Plan
        $professionalPlan = SubscriptionPlan::firstOrCreate(
            ['slug' => 'professional'],
            [
                'name' => 'Professional',
                'description' => 'Paket profesional untuk bisnis menengah dengan fitur advanced',
                'features' => [
                    '3 Bisnis',
                    '10 Outlet',
                    '50 Karyawan',
                    '2000 Produk',
                    'Laporan Advanced',
                    'Support Priority',
                    'Backup Otomatis',
                    'API Access',
                    'Multi-currency'
                ],
                'is_active' => true,
                'is_trial' => false,
            ]
        );

        // Create Enterprise Plan
        $enterprisePlan = SubscriptionPlan::firstOrCreate(
            ['slug' => 'enterprise'],
            [
                'name' => 'Enterprise',
                'description' => 'Paket enterprise untuk bisnis besar dengan fitur unlimited',
                'features' => [
                    'Unlimited Bisnis',
                    'Unlimited Outlet',
                    'Unlimited Karyawan',
                    'Unlimited Produk',
                    'Laporan Custom',
                    'Support 24/7',
                    'Backup Real-time',
                    'API Full Access',
                    'Multi-currency',
                    'White-label',
                    'Custom Integration'
                ],
                'is_active' => true,
                'is_trial' => false,
            ]
        );

        $this->info('Creating subscription plan prices...');

        // Create prices for Trial Plan (Free) - using monthly as duration_type
        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $trialPlan->id,
                'duration_type' => 'monthly',
                'duration_months' => 0,
            ],
            [
                'original_price' => 0,
                'final_price' => 0,
                'discount_percentage' => 0,
                'is_active' => true,
            ]
        );

        // Create prices for Basic Plan
        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $basicPlan->id,
                'duration_type' => 'monthly',
                'duration_months' => 1,
            ],
            [
                'original_price' => 150000,
                'final_price' => 150000,
                'discount_percentage' => 0,
                'is_active' => true,
            ]
        );

        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $basicPlan->id,
                'duration_type' => 'annual',
                'duration_months' => 12,
            ],
            [
                'original_price' => 1800000,
                'final_price' => 1500000, // 2 months free
                'discount_percentage' => 17,
                'is_active' => true,
            ]
        );

        // Create prices for Professional Plan
        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $professionalPlan->id,
                'duration_type' => 'monthly',
                'duration_months' => 1,
            ],
            [
                'original_price' => 300000,
                'final_price' => 300000,
                'discount_percentage' => 0,
                'is_active' => true,
            ]
        );

        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $professionalPlan->id,
                'duration_type' => 'quarterly',
                'duration_months' => 3,
            ],
            [
                'original_price' => 900000,
                'final_price' => 750000, // 1 month free
                'discount_percentage' => 17,
                'is_active' => true,
            ]
        );

        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $professionalPlan->id,
                'duration_type' => 'annual',
                'duration_months' => 12,
            ],
            [
                'original_price' => 3600000,
                'final_price' => 2400000, // 4 months free
                'discount_percentage' => 33,
                'is_active' => true,
            ]
        );

        // Create prices for Enterprise Plan
        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $enterprisePlan->id,
                'duration_type' => 'monthly',
                'duration_months' => 1,
            ],
            [
                'original_price' => 500000,
                'final_price' => 500000,
                'discount_percentage' => 0,
                'is_active' => true,
            ]
        );

        SubscriptionPlanPrice::firstOrCreate(
            [
                'subscription_plan_id' => $enterprisePlan->id,
                'duration_type' => 'annual',
                'duration_months' => 12,
            ],
            [
                'original_price' => 6000000,
                'final_price' => 4000000, // 4 months free
                'discount_percentage' => 33,
                'is_active' => true,
            ]
        );

        $this->info('Subscription plans created successfully!');
        $this->info('Plans: ' . SubscriptionPlan::count());
        $this->info('Prices: ' . SubscriptionPlanPrice::count());

        return 0;
    }
}
