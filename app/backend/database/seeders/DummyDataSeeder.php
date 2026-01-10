<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use App\Models\User;
use App\Models\Business;
use App\Models\Outlet;
use App\Models\Employee;
use App\Models\Product;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use App\Models\UserSubscription;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

/**
 * ⚠️ DUMMY DATA SEEDER - UNTUK TESTING SAJA
 *
 * Seeder ini HANYA untuk membuat data dummy/testing.
 * Seeder ini TIDAK akan menghapus user yang sudah terdaftar melalui aplikasi.
 *
 * Data test yang dibuat:
 * - User: owner@bintanglima.com, admin@bintanglima.com, dll
 * - Business: Restoran Bintang Lima
 * - Outlet, Products, Orders, dll untuk testing
 *
 * ⚠️ PENTING: Seeder ini hanya menghapus data test, BUKAN data user yang sudah daftar!
 */
class DummyDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ✅ Clear only test/dummy data (NOT real user data)
        $this->clearData();

        // Create roles and permissions
        $this->createRolesAndPermissions();

        // Create business with owner
        $businessData = $this->createBusiness();
        $business = $businessData['business'];
        $owner = $businessData['owner'];

        // Create subscription for owner
        $this->createSubscription($owner, $business);

        // Create outlets
        $outlets = $this->createOutlets($business);

        // Create categories
        $categories = $this->createCategories($business);

        // Create products
        $products = $this->createProducts($categories, $outlets, $business);

        // Create customers
        $customers = $this->createCustomers($business);

        // Create users and employees
        $employees = $this->createUsersAndEmployees($business, $outlets, $owner);

        // Create tables
        $this->createTables($outlets);

        // Create orders with items
        $this->createOrders($outlets, $customers, $products, $employees);
    }

    private function clearData()
    {
        // ✅ FIX: Only clear test/dummy data, NOT real user data
        // This seeder is for testing purposes only
        // It should NOT delete users who registered through the app

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // ✅ Only delete test data (identified by specific email patterns or test markers)
        // Delete test businesses and their related data
        $testBusinesses = Business::where('email', 'admin@bintanglima.com')
            ->orWhere('slug', 'restoran-bintang-lima')
            ->pluck('id');

        if ($testBusinesses->isNotEmpty()) {
            // Delete related data for test businesses only
            $businessIds = $testBusinesses->toArray();

            // Delete orders and order items for test businesses
            $testOutlets = Outlet::whereIn('business_id', $businessIds)->pluck('id');
            if ($testOutlets->isNotEmpty()) {
                $testOrders = Order::whereIn('outlet_id', $testOutlets)->pluck('id');
                if ($testOrders->isNotEmpty()) {
                    OrderItem::whereIn('order_id', $testOrders)->delete();
                    Order::whereIn('id', $testOrders)->delete();
                }
                Table::whereIn('outlet_id', $testOutlets)->delete();
            }

            // Delete employees for test businesses
            Employee::whereIn('business_id', $businessIds)->delete();

            // Delete products and categories for test businesses
            Product::whereIn('business_id', $businessIds)->delete();
            Category::whereIn('business_id', $businessIds)->delete();

            // Delete customers for test businesses
            Customer::whereIn('business_id', $businessIds)->delete();

            // Delete outlets for test businesses
            Outlet::whereIn('business_id', $businessIds)->delete();

            // Delete subscriptions for test businesses' owners
            $testOwners = Business::whereIn('id', $businessIds)->pluck('owner_id');
            UserSubscription::whereIn('user_id', $testOwners)->delete();

            // Delete test businesses
            Business::whereIn('id', $businessIds)->delete();

            // Delete test users (only test users, not real registered users)
            $testUsers = User::where('email', 'owner@bintanglima.com')
                ->orWhere('email', 'admin@bintanglima.com')
                ->orWhere('email', 'kasir@bintanglima.com')
                ->orWhere('email', 'kitchen@bintanglima.com')
                ->orWhere('email', 'waiter@bintanglima.com')
                ->pluck('id');

            if ($testUsers->isNotEmpty()) {
                // Clear role assignments for test users only
                try {
                    DB::table('model_has_roles')
                        ->whereIn('model_id', $testUsers)
                        ->where('model_type', 'App\\Models\\User')
                        ->delete();
                    DB::table('model_has_permissions')
                        ->whereIn('model_id', $testUsers)
                        ->where('model_type', 'App\\Models\\User')
                        ->delete();
                } catch (\Exception $e) {
                    // Tables don't exist, skip
                }

                User::whereIn('id', $testUsers)->delete();
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    private function createRolesAndPermissions()
    {
        // Create roles (skip if Spatie package not installed)
        try {
            $roles = [
                'super_admin',
                'owner',
                'admin',
                'kasir',
                'kitchen',
                'waiter',
                'member'
            ];

            foreach ($roles as $role) {
                Role::firstOrCreate(['name' => $role]);
            }
        } catch (\Exception $e) {
            // Spatie package not installed, skip
        }
    }

    private function createBusiness()
    {
        // Create owner user first
        $owner = User::create([
            'name' => 'Owner Restoran',
            'email' => 'owner@bintanglima.com',
            'password' => Hash::make('password123'),
            'role' => 'owner',
            'email_verified_at' => Carbon::now(),
            'created_at' => Carbon::now()->subMonths(6),
        ]);

        try {
            $owner->assignRole('owner');
        } catch (\Exception $e) {
            // Role assignment failed, skip
        }

        // Create business
        $business = Business::create([
            'owner_id' => $owner->id,
            'name' => 'Restoran Bintang Lima',
            'slug' => 'restoran-bintang-lima',
            'email' => 'admin@bintanglima.com',
            'phone' => '081234567890',
            'address' => 'Jl. Sudirman No. 123, Jakarta',
            'status' => 'active',
            'currency' => 'IDR',
            'tax_rate' => 11.0,
            'created_at' => Carbon::now()->subMonths(6),
        ]);

        return [
            'business' => $business,
            'owner' => $owner,
        ];
    }

    private function createSubscription($owner, $business)
    {
        // Try to get a subscription plan
        try {
            $plan = \App\Models\SubscriptionPlan::where('is_active', true)
                ->whereIn('slug', ['professional', 'premium', 'enterprise'])
                ->orderBy('sort_order', 'desc')
                ->first();

            // Fallback to any active plan
            if (!$plan) {
                $plan = \App\Models\SubscriptionPlan::where('is_active', true)->first();
            }

            // If no plan exists, create a dummy one
            if (!$plan) {
                \Log::info('No subscription plan found, creating dummy plan');

                // Create dummy subscription plan
                $plan = \App\Models\SubscriptionPlan::create([
                    'name' => 'Professional',
                    'slug' => 'professional',
                    'description' => 'Paket Professional untuk bisnis menengah',
                    'max_outlets' => 10,
                    'max_products' => -1, // unlimited
                    'max_employees' => 50,
                    'has_online_integration' => true,
                    'has_advanced_reports' => true,
                    'has_api_access' => true,
                    'has_multi_location' => true,
                    'is_active' => true,
                    'sort_order' => 2,
                ]);

                // Create price for the plan
                $price = \App\Models\SubscriptionPlanPrice::create([
                    'subscription_plan_id' => $plan->id,
                    'duration_type' => 'monthly',
                    'duration_months' => 1,
                    'price' => 299000,
                    'discount_percentage' => 0,
                    'final_price' => 299000,
                    'is_active' => true,
                ]);
            } else {
                // Get price for the plan
                $price = $plan->prices()
                    ->where('duration_type', 'monthly')
                    ->where('is_active', true)
                    ->first();

                // Fallback to any active price
                if (!$price) {
                    $price = $plan->prices()->where('is_active', true)->first();
                }

                // If no price exists, create one
                if (!$price) {
                    $price = \App\Models\SubscriptionPlanPrice::create([
                        'subscription_plan_id' => $plan->id,
                        'duration_type' => 'monthly',
                        'duration_months' => 1,
                        'price' => 299000,
                        'discount_percentage' => 0,
                        'final_price' => 299000,
                        'is_active' => true,
                    ]);
                }
            }

            // Create active subscription for owner
            $subscription = UserSubscription::create([
                'user_id' => $owner->id,
                'subscription_plan_id' => $plan->id,
                'subscription_plan_price_id' => $price->id,
                'subscription_code' => 'SUB-DUMMY-' . strtoupper(\Str::random(8)),
                'status' => 'active',
                'amount_paid' => $price->final_price,
                'starts_at' => Carbon::now()->subMonths(3),
                'ends_at' => Carbon::now()->addMonths(9), // 1 year subscription (started 3 months ago)
                'trial_ends_at' => null,
                'is_trial' => false,
                'plan_features' => $plan->toArray(), // Snapshot of plan features
                'notes' => 'Dummy subscription for testing',
                'created_at' => Carbon::now()->subMonths(3),
            ]);

            // Update business with current subscription
            $business->update([
                'current_subscription_id' => $subscription->id,
                'subscription_expires_at' => $subscription->ends_at,
            ]);

            \Log::info('Created subscription for owner', [
                'owner_id' => $owner->id,
                'plan' => $plan->name,
                'subscription_id' => $subscription->id,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create subscription: ' . $e->getMessage());
            // Continue without subscription - owner can still access basic features
        }
    }

    private function createOutlets($business)
    {
        $outlets = [];

        $outletData = [
            [
                'name' => 'Cabang Sudirman',
                'code' => 'SUD',
                'address' => 'Jl. Sudirman No. 123, Jakarta',
                'phone' => '021-1234567',
            ],
            [
                'name' => 'Cabang Thamrin',
                'code' => 'THM',
                'address' => 'Jl. Thamrin No. 456, Jakarta',
                'phone' => '021-2345678',
            ],
            [
                'name' => 'Cabang Senayan',
                'code' => 'SNY',
                'address' => 'Jl. Senayan No. 789, Jakarta',
                'phone' => '021-3456789',
            ]
        ];

        foreach ($outletData as $data) {
            $outletSlug = \Illuminate\Support\Str::slug($data['name']);

            // Ensure unique slug
            $originalSlug = $outletSlug;
            $counter = 1;
            while (Outlet::where('slug', $outletSlug)->exists()) {
                $outletSlug = $originalSlug . '-' . $counter;
                $counter++;
            }

            $outlets[] = Outlet::create([
                'business_id' => $business->id,
                'name' => $data['name'],
                'code' => $data['code'],
                'slug' => $outletSlug,
                'address' => $data['address'],
                'phone' => $data['phone'],
                'is_active' => true,
                'is_public' => true,
                'created_at' => Carbon::now()->subMonths(6),
            ]);
        }

        return $outlets;
    }

    private function createCategories($business)
    {
        $categories = [];

        $categoryData = [
            ['name' => 'Makanan Utama', 'slug' => 'makanan-utama', 'description' => 'Menu utama restoran'],
            ['name' => 'Minuman', 'slug' => 'minuman', 'description' => 'Berbagai jenis minuman'],
            ['name' => 'Dessert', 'slug' => 'dessert', 'description' => 'Makanan penutup'],
            ['name' => 'Snack', 'slug' => 'snack', 'description' => 'Camilan ringan'],
            ['name' => 'Paket', 'slug' => 'paket', 'description' => 'Paket makanan lengkap'],
        ];

        foreach ($categoryData as $index => $data) {
            $categories[] = Category::create([
                'business_id' => $business->id,
                'name' => $data['name'],
                'slug' => $data['slug'],
                'description' => $data['description'],
                'sort_order' => $index + 1,
                'is_active' => true,
                'created_at' => Carbon::now()->subMonths(6),
            ]);
        }

        return $categories;
    }

    private function createProducts($categories, $outlets, $business)
    {
        $products = [];

        $productData = [
            // Makanan Utama
            ['name' => 'Nasi Goreng Spesial', 'category_id' => 1, 'price' => 25000, 'cost' => 15000],
            ['name' => 'Ayam Bakar Madu', 'category_id' => 1, 'price' => 35000, 'cost' => 20000],
            ['name' => 'Ikan Gurame Asam Manis', 'category_id' => 1, 'price' => 45000, 'cost' => 25000],
            ['name' => 'Sate Kambing', 'category_id' => 1, 'price' => 30000, 'cost' => 18000],
            ['name' => 'Rendang Daging', 'category_id' => 1, 'price' => 40000, 'cost' => 22000],
            ['name' => 'Gado-gado', 'category_id' => 1, 'price' => 20000, 'cost' => 12000],
            ['name' => 'Soto Ayam', 'category_id' => 1, 'price' => 18000, 'cost' => 10000],
            ['name' => 'Rawon Daging', 'category_id' => 1, 'price' => 22000, 'cost' => 13000],

            // Minuman
            ['name' => 'Es Teh Manis', 'category_id' => 2, 'price' => 8000, 'cost' => 3000],
            ['name' => 'Es Jeruk', 'category_id' => 2, 'price' => 12000, 'cost' => 5000],
            ['name' => 'Jus Alpukat', 'category_id' => 2, 'price' => 15000, 'cost' => 8000],
            ['name' => 'Kopi Hitam', 'category_id' => 2, 'price' => 10000, 'cost' => 4000],
            ['name' => 'Cappuccino', 'category_id' => 2, 'price' => 18000, 'cost' => 8000],
            ['name' => 'Es Campur', 'category_id' => 2, 'price' => 20000, 'cost' => 10000],
            ['name' => 'Air Mineral', 'category_id' => 2, 'price' => 5000, 'cost' => 2000],

            // Dessert
            ['name' => 'Pudding Coklat', 'category_id' => 3, 'price' => 15000, 'cost' => 8000],
            ['name' => 'Es Krim Vanilla', 'category_id' => 3, 'price' => 12000, 'cost' => 6000],
            ['name' => 'Kue Lapis', 'category_id' => 3, 'price' => 18000, 'cost' => 10000],
            ['name' => 'Pisang Goreng', 'category_id' => 3, 'price' => 10000, 'cost' => 5000],

            // Snack
            ['name' => 'Kerupuk Udang', 'category_id' => 4, 'price' => 8000, 'cost' => 4000],
            ['name' => 'Tahu Crispy', 'category_id' => 4, 'price' => 12000, 'cost' => 6000],
            ['name' => 'Tempe Mendoan', 'category_id' => 4, 'price' => 10000, 'cost' => 5000],

            // Paket
            ['name' => 'Paket Nasi + Ayam + Minuman', 'category_id' => 5, 'price' => 45000, 'cost' => 25000],
            ['name' => 'Paket Keluarga (4 orang)', 'category_id' => 5, 'price' => 120000, 'cost' => 70000],
            ['name' => 'Paket Hemat', 'category_id' => 5, 'price' => 25000, 'cost' => 15000],
        ];

        foreach ($productData as $index => $data) {
            $product = Product::create([
                'business_id' => $business->id,
                'category_id' => $data['category_id'],
                'name' => $data['name'],
                'slug' => \Str::slug($data['name']),
                'sku' => 'SKU' . str_pad($index + 1, 4, '0', STR_PAD_LEFT),
                'price' => $data['price'],
                'cost' => $data['cost'],
                'stock' => rand(50, 200),
                'min_stock' => 10,
                'stock_type' => 'tracked',
                'is_active' => true,
                'has_variants' => false,
                'description' => 'Produk berkualitas tinggi',
                'created_at' => Carbon::now()->subMonths(6),
            ]);

            // Skip outlet_products assignment for now

            $products[] = $product;
        }

        return $products;
    }

    private function createCustomers($business)
    {
        $customers = [];

        $customerData = [
            ['name' => 'Budi Santoso', 'phone' => '081234567890', 'email' => 'budi@email.com'],
            ['name' => 'Siti Nurhaliza', 'phone' => '081234567891', 'email' => 'siti@email.com'],
            ['name' => 'Ahmad Wijaya', 'phone' => '081234567892', 'email' => 'ahmad@email.com'],
            ['name' => 'Dewi Sartika', 'phone' => '081234567893', 'email' => 'dewi@email.com'],
            ['name' => 'Rudi Hartono', 'phone' => '081234567894', 'email' => 'rudi@email.com'],
            ['name' => 'Maya Sari', 'phone' => '081234567895', 'email' => 'maya@email.com'],
            ['name' => 'Joko Widodo', 'phone' => '081234567896', 'email' => 'joko@email.com'],
            ['name' => 'Ani Susanti', 'phone' => '081234567897', 'email' => 'ani@email.com'],
            ['name' => 'Bambang Pamungkas', 'phone' => '081234567898', 'email' => 'bambang@email.com'],
            ['name' => 'Citra Dewi', 'phone' => '081234567899', 'email' => 'citra@email.com'],
            ['name' => 'Pelanggan Walk-in', 'phone' => null, 'email' => null],
            ['name' => 'Pelanggan Member', 'phone' => '081234567900', 'email' => 'member@email.com'],
        ];

        foreach ($customerData as $data) {
            $customers[] = Customer::create([
                'business_id' => $business->id,
                'name' => $data['name'],
                'phone' => $data['phone'],
                'email' => $data['email'],
                'address' => $data['name'] === 'Pelanggan Walk-in' ? null : 'Alamat ' . $data['name'],
                'created_at' => Carbon::now()->subMonths(6),
            ]);
        }

        return $customers;
    }

    private function createUsersAndEmployees($business, $outlets, $owner)
    {
        $employees = [];

        $userData = [
            // Super Admin
            ['name' => 'Super Admin', 'email' => 'superadmin@bintanglima.com', 'role' => 'super_admin', 'outlet_id' => null],
            // Skip owner - already created
            // Admins
            ['name' => 'Admin Sudirman', 'email' => 'admin1@bintanglima.com', 'role' => 'admin', 'outlet_id' => 1],
            ['name' => 'Admin Thamrin', 'email' => 'admin2@bintanglima.com', 'role' => 'admin', 'outlet_id' => 2],
            // Kasir
            ['name' => 'Kasir 1 Sudirman', 'email' => 'kasir1@bintanglima.com', 'role' => 'kasir', 'outlet_id' => 1],
            ['name' => 'Kasir 2 Sudirman', 'email' => 'kasir2@bintanglima.com', 'role' => 'kasir', 'outlet_id' => 1],
            ['name' => 'Kasir 1 Thamrin', 'email' => 'kasir3@bintanglima.com', 'role' => 'kasir', 'outlet_id' => 2],
            ['name' => 'Kasir 1 Senayan', 'email' => 'kasir4@bintanglima.com', 'role' => 'kasir', 'outlet_id' => 3],
            // Kitchen
            ['name' => 'Chef Sudirman', 'email' => 'chef1@bintanglima.com', 'role' => 'kitchen', 'outlet_id' => 1],
            ['name' => 'Chef Thamrin', 'email' => 'chef2@bintanglima.com', 'role' => 'kitchen', 'outlet_id' => 2],
            ['name' => 'Chef Senayan', 'email' => 'chef3@bintanglima.com', 'role' => 'kitchen', 'outlet_id' => 3],
            // Waiter
            ['name' => 'Waiter 1 Sudirman', 'email' => 'waiter1@bintanglima.com', 'role' => 'waiter', 'outlet_id' => 1],
            ['name' => 'Waiter 2 Sudirman', 'email' => 'waiter2@bintanglima.com', 'role' => 'waiter', 'outlet_id' => 1],
            ['name' => 'Waiter 1 Thamrin', 'email' => 'waiter3@bintanglima.com', 'role' => 'waiter', 'outlet_id' => 2],
            ['name' => 'Waiter 1 Senayan', 'email' => 'waiter4@bintanglima.com', 'role' => 'waiter', 'outlet_id' => 3],
        ];

        foreach ($userData as $data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make('password123'),
                'role' => $data['role'],
                'email_verified_at' => Carbon::now(),
                'created_at' => Carbon::now()->subMonths(6),
            ]);

            try {
                $user->assignRole($data['role']);
            } catch (\Exception $e) {
                // Role assignment failed, skip
            }

            if ($data['outlet_id']) {
                $employee = Employee::create([
                    'user_id' => $user->id,
                    'business_id' => $business->id,
                    'employee_code' => 'EMP' . str_pad($user->id, 4, '0', STR_PAD_LEFT),
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'phone' => '081234567' . str_pad($user->id, 3, '0', STR_PAD_LEFT),
                    'address' => 'Alamat ' . $data['name'],
                    'salary' => $this->getSalaryByRole($data['role']),
                    'commission_rate' => 0.05,
                    'is_active' => true,
                    'hired_at' => Carbon::now()->subMonths(rand(1, 6)),
                    'created_at' => Carbon::now()->subMonths(6),
                ]);

                // Create EmployeeOutlet assignment for kasir, kitchen, waiter roles
                if (in_array($data['role'], ['kasir', 'kitchen', 'waiter', 'admin'])) {
                    \App\Models\EmployeeOutlet::create([
                        'user_id' => $user->id,
                        'business_id' => $business->id,
                        'outlet_id' => $outlets[$data['outlet_id'] - 1]->id, // Adjust for 0-based index
                        'is_primary' => true,
                        'created_at' => Carbon::now()->subMonths(6),
                    ]);
                }

                $employees[] = $employee;
            }
        }

        return $employees;
    }

    private function getSalaryByRole($role)
    {
        $salaries = [
            'admin' => 8000000,
            'kasir' => 5000000,
            'kitchen' => 6000000,
            'waiter' => 4500000,
        ];

        return $salaries[$role] ?? 4000000;
    }

    private function createTables($outlets)
    {
        foreach ($outlets as $outlet) {
            // Create 15 tables per outlet
            for ($i = 1; $i <= 15; $i++) {
                Table::create([
                    'outlet_id' => $outlet->id,
                    'name' => 'Meja ' . $i,
                    'qr_code' => 'QR' . $outlet->id . '_' . $i,
                    'capacity' => rand(2, 8),
                    'status' => 'available',
                    'created_at' => Carbon::now()->subMonths(6),
                ]);
            }
        }
    }

    private function createOrders($outlets, $customers, $products, $employees)
    {
        $paymentMethods = ['cash', 'credit_card', 'debit_card', 'e_wallet', 'bank_transfer'];
        $statuses = ['completed', 'pending', 'cancelled'];

        // Create orders for the last 30 days
        for ($i = 0; $i < 30; $i++) {
            $date = Carbon::now()->subDays($i);

            // Create 5-15 orders per day
            $ordersPerDay = rand(5, 15);

            for ($j = 0; $j < $ordersPerDay; $j++) {
                $outlet = $outlets[array_rand($outlets)];
                $customer = $customers[array_rand($customers)];
                $employee = collect($employees)->random();

                $orderTime = $date->copy()->addHours(rand(8, 22))->addMinutes(rand(0, 59));

                // Calculate order amounts
                $subtotal = 0;
                $discountAmount = rand(0, 50000);
                $taxRate = 0.11; // 11% PPN
                $taxAmount = 0;

                $order = Order::create([
                    'order_number' => 'ORD' . $date->format('Ymd') . str_pad($j, 4, '0', STR_PAD_LEFT),
                    'business_id' => $outlet->business_id,
                    'outlet_id' => $outlet->id,
                    'customer_id' => $customer->id,
                    'table_id' => rand(1, 15),
                    'employee_id' => $employee->id,
                    'type' => 'dine_in',
                    'status' => $statuses[array_rand($statuses)],
                    'subtotal' => $subtotal,
                    'discount_amount' => $discountAmount,
                    'tax_amount' => $taxAmount,
                    'total' => $subtotal - $discountAmount + $taxAmount,
                    'payment_status' => 'paid',
                    'notes' => rand(0, 1) ? 'Pesanan khusus' : null,
                    'ordered_at' => $orderTime,
                    'created_at' => $orderTime,
                    'updated_at' => $orderTime,
                ]);

                // Create order items
                $itemCount = rand(1, 5);
                $selectedProducts = collect($products)->random($itemCount);

                foreach ($selectedProducts as $product) {
                    $quantity = rand(1, 3);
                    $price = $product->price;
                    $itemTotal = $price * $quantity;
                    $subtotal += $itemTotal;

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity' => $quantity,
                        'price' => $price,
                        'subtotal' => $itemTotal,
                        'created_at' => $orderTime,
                    ]);
                }

                // Update order totals
                $taxAmount = ($subtotal - $discountAmount) * $taxRate;
                $totalAmount = $subtotal - $discountAmount + $taxAmount;

                $order->update([
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'total' => $totalAmount,
                ]);
            }
        }
    }
}
