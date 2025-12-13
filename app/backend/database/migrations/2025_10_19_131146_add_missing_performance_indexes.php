<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations - Add only missing indexes
     */
    public function up(): void
    {
        // Helper function to safely add index
        $addIndexSafely = function($table, $columns, $indexName = null) {
            try {
                if (Schema::hasTable($table)) {
                    Schema::table($table, function (Blueprint $blueprint) use ($columns, $indexName) {
                        if ($indexName) {
                            $blueprint->index($columns, $indexName);
                        } else {
                            $blueprint->index($columns);
                        }
                    });
                }
            } catch (\Exception $e) {
                // Index likely already exists - skip silently
            }
        };

        // Transactions - Critical for POS
        $addIndexSafely('transactions', ['outlet_id', 'created_at'], 'trans_outlet_date_idx');
        $addIndexSafely('transactions', ['user_id', 'created_at'], 'trans_user_date_idx');
        $addIndexSafely('transactions', ['status', 'created_at'], 'trans_status_date_idx');
        $addIndexSafely('transactions', 'payment_method', 'trans_payment_idx');

        // Products
        $addIndexSafely('products', ['business_id', 'is_active'], 'prod_business_active_idx');

        // Product Outlets
        $addIndexSafely('product_outlets', ['outlet_id', 'product_id'], 'prod_outlet_product_idx');
        $addIndexSafely('product_outlets', ['outlet_id', 'stock'], 'prod_outlet_stock_idx');

        // Transaction Items
        $addIndexSafely('transaction_items', 'transaction_id', 'trans_items_trans_idx');
        $addIndexSafely('transaction_items', 'product_id', 'trans_items_product_idx');

        // Inventory Movements
        $addIndexSafely('inventory_movements', ['product_id', 'type', 'created_at'], 'inv_product_type_date_idx');
        $addIndexSafely('inventory_movements', 'created_at', 'inv_created_at_idx');

        // User Outlets
        $addIndexSafely('user_outlets', ['user_id', 'outlet_id', 'is_active'], 'user_outlet_active_idx');

        // Discounts
        $addIndexSafely('discounts', ['outlet_id', 'is_active', 'start_date'], 'disc_outlet_active_date_idx');

        // Employees
        $addIndexSafely('employees', 'business_id', 'emp_business_idx');
        $addIndexSafely('employees', 'user_id', 'emp_user_idx');

        // Shifts
        $addIndexSafely('shifts', ['employee_id', 'outlet_id', 'opened_at'], 'shift_emp_outlet_opened_idx');
        $addIndexSafely('shifts', ['outlet_id', 'closed_at'], 'shift_outlet_closed_idx');

        // Customers
        $addIndexSafely('customers', 'business_id', 'cust_business_idx');

        // Categories
        $addIndexSafely('categories', 'business_id', 'cat_business_idx');

        // Suppliers
        $addIndexSafely('suppliers', 'business_id', 'supp_business_idx');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $dropIndexSafely = function($table, $indexName) {
            try {
                if (Schema::hasTable($table)) {
                    Schema::table($table, function (Blueprint $blueprint) use ($indexName) {
                        $blueprint->dropIndex($indexName);
                    });
                }
            } catch (\Exception $e) {
                // Index doesn't exist - skip silently
            }
        };

        // Drop all indexes we created
        $dropIndexSafely('transactions', 'trans_outlet_date_idx');
        $dropIndexSafely('transactions', 'trans_user_date_idx');
        $dropIndexSafely('transactions', 'trans_status_date_idx');
        $dropIndexSafely('transactions', 'trans_payment_idx');
        $dropIndexSafely('products', 'prod_business_active_idx');
        $dropIndexSafely('product_outlets', 'prod_outlet_product_idx');
        $dropIndexSafely('product_outlets', 'prod_outlet_stock_idx');
        $dropIndexSafely('transaction_items', 'trans_items_trans_idx');
        $dropIndexSafely('transaction_items', 'trans_items_product_idx');
        $dropIndexSafely('inventory_movements', 'inv_product_type_date_idx');
        $dropIndexSafely('inventory_movements', 'inv_created_at_idx');
        $dropIndexSafely('user_outlets', 'user_outlet_active_idx');
        $dropIndexSafely('discounts', 'disc_outlet_active_date_idx');
        $dropIndexSafely('employees', 'emp_business_idx');
        $dropIndexSafely('employees', 'emp_user_idx');
        $dropIndexSafely('shifts', 'shift_emp_outlet_opened_idx');
        $dropIndexSafely('shifts', 'shift_outlet_closed_idx');
        $dropIndexSafely('customers', 'cust_business_idx');
        $dropIndexSafely('categories', 'cat_business_idx');
        $dropIndexSafely('suppliers', 'supp_business_idx');
    }
};
