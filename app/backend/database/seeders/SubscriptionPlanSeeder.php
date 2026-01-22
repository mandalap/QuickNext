<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanPrice;
use Illuminate\Support\Str;

/**
 * ⚠️ SUBSCRIPTION PLAN SEEDER - WAJIB DIJALANKAN
 * 
 * Seeder ini membuat paket subscription yang diperlukan untuk sistem:
 * - Trial 7 Hari (Gratis)
 * - Basic Plan
 * - Professional Plan (Paling Populer)
 * - Enterprise Plan
 * 
 * ⚠️ PENTING: Seeder ini HARUS dijalankan sebelum user bisa memilih paket subscription!
 */
class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ✅ Check if plans already exist to prevent duplicates
        $existingPlans = SubscriptionPlan::whereIn('slug', [
            'trial-7-days',
            'basic',
            'professional',
            'enterprise'
        ])->count();

        if ($existingPlans >= 4) {
            $this->command->warn('⚠️  Subscription plans already exist. Skipping...');
            $this->command->info('   If you want to recreate plans, delete them first or use: php artisan migrate:fresh --seed');
            return;
        }
        // Free Trial Plan (for 7 days free trial)
        $trialPlan = SubscriptionPlan::create([
            'name' => 'Trial 7 Hari',
            'slug' => 'trial-7-days',
            'description' => 'Coba gratis selama 7 hari dengan akses penuh ke semua fitur Basic',
            'max_outlets' => 1,
            'max_products' => 50,
            'max_employees' => 2,
            'has_online_integration' => false,
            'has_advanced_reports' => false,
            'has_api_access' => false,
            'has_multi_location' => false,
            'features' => json_encode([
                'Kelola transaksi penjualan',
                'Manajemen produk & stok',
                'Laporan penjualan dasar',
                'Manajemen pelanggan',
                'Support via email'
            ]),
            'is_active' => true,
            'sort_order' => 0,
        ]);

        // Trial price is 0
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $trialPlan->id,
            'duration_type' => 'monthly',
            'duration_months' => 0, // 0 for trial
            'price' => 0,
            'discount_percentage' => 0,
            'final_price' => 0,
            'is_active' => true,
        ]);

        // Basic Plan
        $basicPlan = SubscriptionPlan::create([
            'name' => 'Basic',
            'slug' => 'basic',
            'description' => 'Paket terbaik untuk bisnis kecil yang baru memulai',
            'max_outlets' => 1,
            'max_products' => 100,
            'max_employees' => 5,
            'has_online_integration' => false,
            'has_advanced_reports' => false,
            'has_api_access' => false,
            'has_multi_location' => false,
            'features' => json_encode([
                'Kelola transaksi penjualan',
                'Manajemen produk & stok',
                'Laporan penjualan dasar',
                'Manajemen pelanggan',
                'Support via email',
                'Backup data otomatis'
            ]),
            'is_active' => true,
            'is_popular' => false,
            'cta_text' => 'Mulai Sekarang',
            'sort_order' => 1,
        ]);

        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $basicPlan->id,
            'duration_type' => 'monthly',
            'duration_months' => 1,
            'price' => 99000,
            'discount_percentage' => 0,
            'final_price' => 99000,
            'is_active' => true,
        ]);

        // Basic 3 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $basicPlan->id,
            'duration_type' => 'quarterly',
            'duration_months' => 3,
            'price' => 297000,
            'discount_percentage' => 10,
            'final_price' => 267300, // Rp 89.100/bulan
            'is_active' => true,
        ]);

        // Basic 6 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $basicPlan->id,
            'duration_type' => 'semi_annual',
            'duration_months' => 6,
            'price' => 594000,
            'discount_percentage' => 15,
            'final_price' => 504900, // Rp 84.150/bulan
            'is_active' => true,
        ]);

        // Basic 12 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $basicPlan->id,
            'duration_type' => 'annual',
            'duration_months' => 12,
            'price' => 1188000,
            'discount_percentage' => 20,
            'final_price' => 950400, // Rp 79.200/bulan
            'is_active' => true,
        ]);

        // Professional Plan
        $proPlan = SubscriptionPlan::create([
            'name' => 'Professional',
            'slug' => 'professional',
            'description' => 'Untuk bisnis yang sedang berkembang dengan beberapa outlet',
            'max_outlets' => 3,
            'max_products' => 500,
            'max_employees' => 15,
            // ✅ FIX: Set semua features ke true untuk Professional (kecuali has_api_access)
            'has_reports_access' => true,
            'has_advanced_reports' => true,
            'has_kitchen_access' => true,
            'has_tables_access' => true,
            'has_attendance_access' => true,
            'has_inventory_access' => true,
            'has_promo_access' => true,
            'has_stock_transfer_access' => true,
            'has_self_service_access' => true,
            'has_online_integration' => true,
            'has_multi_location' => true,
            'has_api_access' => false, // API access hanya untuk Enterprise
            'features' => json_encode([
                'Semua fitur Basic',
                'Multi lokasi (3 outlet)',
                'Integrasi online',
                'Laporan advanced',
                'Manajemen supplier',
                'Loyalty program',
                'Support prioritas via WA',
                'Training online',
                'Akses Kitchen',
                'Akses Tables',
                'Akses Attendance',
                'Akses Inventory',
                'Akses Promo',
                'Akses Stock Transfer',
                'Akses Self Service'
            ]),
            'is_active' => true,
            'is_popular' => true,
            'cta_text' => 'Paling Populer',
            'sort_order' => 2,
        ]);

        // Professional 1 month
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $proPlan->id,
            'duration_type' => 'monthly',
            'duration_months' => 1,
            'price' => 249000,
            'discount_percentage' => 0,
            'final_price' => 249000,
            'is_active' => true,
        ]);

        // Professional 3 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $proPlan->id,
            'duration_type' => 'quarterly',
            'duration_months' => 3,
            'price' => 747000,
            'discount_percentage' => 10,
            'final_price' => 672300, // Rp 224.100/bulan
            'is_active' => true,
        ]);

        // Professional 6 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $proPlan->id,
            'duration_type' => 'semi_annual',
            'duration_months' => 6,
            'price' => 1494000,
            'discount_percentage' => 15,
            'final_price' => 1269900, // Rp 211.650/bulan
            'is_active' => true,
        ]);

        // Professional 12 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $proPlan->id,
            'duration_type' => 'annual',
            'duration_months' => 12,
            'price' => 2988000,
            'discount_percentage' => 25,
            'final_price' => 2241000, // Rp 186.750/bulan
            'is_active' => true,
        ]);

        // Enterprise Plan
        $enterprisePlan = SubscriptionPlan::create([
            'name' => 'Enterprise',
            'slug' => 'enterprise',
            'description' => 'Solusi lengkap untuk bisnis besar dengan banyak cabang',
            'max_outlets' => -1, // Unlimited
            'max_products' => -1, // Unlimited
            'max_employees' => -1, // Unlimited
            'has_online_integration' => true,
            'has_advanced_reports' => true,
            'has_api_access' => true,
            'has_multi_location' => true,
            'features' => json_encode([
                'Semua fitur Professional',
                'Unlimited outlets',
                'Unlimited produk & karyawan',
                'API access',
                'Custom reports',
                'Dedicated account manager',
                'Support 24/7',
                'Training on-site',
                'Custom integration',
                'White label option'
            ]),
            'is_active' => true,
            'is_popular' => false,
            'cta_text' => 'Hubungi Kami',
            'sort_order' => 3,
        ]);

        // Enterprise 1 month
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $enterprisePlan->id,
            'duration_type' => 'monthly',
            'duration_months' => 1,
            'price' => 499000,
            'discount_percentage' => 0,
            'final_price' => 499000,
            'is_active' => true,
        ]);

        // Enterprise 3 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $enterprisePlan->id,
            'duration_type' => 'quarterly',
            'duration_months' => 3,
            'price' => 1497000,
            'discount_percentage' => 10,
            'final_price' => 1347300, // Rp 449.100/bulan
            'is_active' => true,
        ]);

        // Enterprise 6 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $enterprisePlan->id,
            'duration_type' => 'semi_annual',
            'duration_months' => 6,
            'price' => 2994000,
            'discount_percentage' => 15,
            'final_price' => 2544900, // Rp 424.150/bulan
            'is_active' => true,
        ]);

        // Enterprise 12 months
        SubscriptionPlanPrice::create([
            'subscription_plan_id' => $enterprisePlan->id,
            'duration_type' => 'annual',
            'duration_months' => 12,
            'price' => 5988000,
            'discount_percentage' => 30,
            'final_price' => 4191600, // Rp 349.300/bulan
            'is_active' => true,
        ]);

        $this->command->info('✅ Subscription plans seeded successfully!');
        $this->command->info('📦 Plans created:');
        $this->command->info('   - Trial 7 Hari (Gratis)');
        $this->command->info('   - Basic Plan (Rp 99.000/bulan)');
        $this->command->info('   - Professional Plan (Rp 249.000/bulan) - Paling Populer');
        $this->command->info('   - Enterprise Plan (Rp 499.000/bulan)');
        $this->command->info('🌐 Users can now select subscription plans at: /subscription-plans');
    }
}
