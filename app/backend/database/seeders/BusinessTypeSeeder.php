<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BusinessType;

class BusinessTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $businessTypes = [
            [
                'code' => 'restaurant',
                'name' => 'Restaurant & Cafe',
                'description' => 'Restaurant, cafe, warung makan, dan bisnis makanan minuman lainnya',
                'icon' => 'utensils',
                'has_products' => true,
                'has_services' => false,
                'requires_stock' => true,
                'requires_tables' => true,
                'requires_kitchen' => true,
                'order_statuses' => ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
                'pricing_models' => ['per_unit'],
                'order_fields' => [],
                'features' => ['tables', 'kitchen', 'waiter', 'takeaway', 'delivery'],
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'code' => 'retail',
                'name' => 'Retail Store',
                'description' => 'Toko retail, minimarket, supermarket, dan toko kelontong',
                'icon' => 'shopping-bag',
                'has_products' => true,
                'has_services' => false,
                'requires_stock' => true,
                'requires_tables' => false,
                'requires_kitchen' => false,
                'order_statuses' => ['pending', 'processing', 'completed', 'cancelled'],
                'pricing_models' => ['per_unit'],
                'order_fields' => [],
                'features' => ['inventory', 'barcode', 'member'],
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'code' => 'laundry',
                'name' => 'Laundry',
                'description' => 'Usaha laundry, cuci setrika, dry cleaning',
                'icon' => 'tshirt',
                'has_products' => false,
                'has_services' => true,
                'requires_stock' => false,
                'requires_tables' => false,
                'requires_kitchen' => false,
                'order_statuses' => ['received', 'washing', 'ironing', 'ready', 'completed', 'picked_up'],
                'pricing_models' => ['per_kg', 'per_item', 'package'],
                'order_fields' => ['weight', 'item_type', 'special_notes', 'pickup_date'],
                'features' => ['weight_tracking', 'pickup_notification', 'express_service'],
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'code' => 'salon',
                'name' => 'Salon & Barbershop',
                'description' => 'Salon kecantikan, barbershop, spa, dan perawatan tubuh',
                'icon' => 'scissors',
                'has_products' => true,
                'has_services' => true,
                'requires_stock' => true,
                'requires_tables' => false,
                'requires_kitchen' => false,
                'order_statuses' => ['booked', 'in_progress', 'completed', 'cancelled'],
                'pricing_models' => ['per_service', 'package'],
                'order_fields' => ['duration', 'therapist', 'notes'],
                'features' => ['appointment', 'membership', 'loyalty'],
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'code' => 'pharmacy',
                'name' => 'Apotik & Farmasi',
                'description' => 'Apotik, toko obat, dan penjualan produk kesehatan',
                'icon' => 'pills',
                'has_products' => true,
                'has_services' => false,
                'requires_stock' => true,
                'requires_tables' => false,
                'requires_kitchen' => false,
                'order_statuses' => ['pending', 'processing', 'completed', 'cancelled'],
                'pricing_models' => ['per_unit'],
                'order_fields' => ['prescription', 'notes'],
                'features' => ['prescription', 'expiry_tracking', 'batch_tracking'],
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'code' => 'bakery',
                'name' => 'Bakery & Pastry',
                'description' => 'Toko roti, pastry, kue, dan produk bakery lainnya',
                'icon' => 'cake',
                'has_products' => true,
                'has_services' => false,
                'requires_stock' => true,
                'requires_tables' => false,
                'requires_kitchen' => true,
                'order_statuses' => ['pending', 'baking', 'ready', 'completed', 'cancelled'],
                'pricing_models' => ['per_unit', 'per_kg'],
                'order_fields' => ['special_notes'],
                'features' => ['kitchen', 'takeaway', 'delivery', 'pre_order'],
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'code' => 'coffee',
                'name' => 'Coffee Shop',
                'description' => 'Kedai kopi, coffee shop, dan minuman kopi',
                'icon' => 'coffee',
                'has_products' => true,
                'has_services' => false,
                'requires_stock' => true,
                'requires_tables' => true,
                'requires_kitchen' => true,
                'order_statuses' => ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
                'pricing_models' => ['per_unit'],
                'order_fields' => ['size', 'sugar_level', 'ice_level', 'special_notes'],
                'features' => ['tables', 'kitchen', 'takeaway', 'delivery', 'loyalty'],
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'code' => 'general',
                'name' => 'Bisnis Umum',
                'description' => 'Bisnis umum yang fleksibel untuk berbagai jenis usaha',
                'icon' => 'briefcase',
                'has_products' => true,
                'has_services' => true,
                'requires_stock' => true,
                'requires_tables' => false,
                'requires_kitchen' => false,
                'order_statuses' => ['pending', 'processing', 'completed', 'cancelled'],
                'pricing_models' => ['per_unit', 'per_kg', 'per_item', 'package'],
                'order_fields' => [],
                'features' => ['custom_fields'],
                'is_active' => true,
                'sort_order' => 99,
            ],
        ];

        foreach ($businessTypes as $type) {
            BusinessType::updateOrCreate(
                ['code' => $type['code']],
                $type
            );
        }

        // ✅ Log success message
        $this->command->info('✅ Business types seeded successfully!');
        $this->command->info('   Total: ' . count($businessTypes) . ' business types');
    }
}
