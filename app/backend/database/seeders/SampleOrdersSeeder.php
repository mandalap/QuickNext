<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Business;
use App\Models\Outlet;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Product;
use App\Models\Table;
use Carbon\Carbon;

class SampleOrdersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first business and outlet
        $business = Business::first();
        $outlet = Outlet::first();
        
        if (!$business || !$outlet) {
            $this->command->error('Business or Outlet not found. Please run BusinessSeeder first.');
            return;
        }

        // Get or create sample customer
        $customer = Customer::firstOrCreate([
            'business_id' => $business->id,
            'phone' => '081234567890'
        ], [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'address' => 'Jl. Contoh No. 123'
        ]);

        // Get or create sample employee
        $employee = Employee::where('business_id', $business->id)->first();
        if (!$employee) {
            $this->command->error('No employee found. Please create an employee first.');
            return;
        }

        // Get or create sample table
        $table = Table::where('business_id', $business->id)->first();
        if (!$table) {
            $this->command->error('No table found. Please create a table first.');
            return;
        }

        // Get sample products
        $products = Product::where('business_id', $business->id)->take(3)->get();
        if ($products->isEmpty()) {
            $this->command->error('No products found. Please create products first.');
            return;
        }

        // Create sample orders for today
        $today = Carbon::today();
        
        // Order 1: Dine-in order
        $order1 = Order::create([
            'order_number' => 'ORD-' . date('Ymd') . '-001',
            'business_id' => $business->id,
            'outlet_id' => $outlet->id,
            'customer_id' => $customer->id,
            'table_id' => $table->id,
            'employee_id' => $employee->id,
            'type' => 'dine_in',
            'status' => 'completed',
            'subtotal' => 50000,
            'tax_amount' => 5000,
            'discount_amount' => 0,
            'service_charge' => 0,
            'delivery_fee' => 0,
            'total' => 55000,
            'paid_amount' => 55000,
            'change_amount' => 0,
            'payment_status' => 'paid',
            'notes' => 'Extra spicy',
            'ordered_at' => $today->copy()->setTime(10, 30),
        ]);

        // Add items to order 1
        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $products[0]->id,
            'quantity' => 2,
            'price' => 25000,
            'total' => 50000,
        ]);

        // Order 2: Takeaway order
        $order2 = Order::create([
            'order_number' => 'ORD-' . date('Ymd') . '-002',
            'business_id' => $business->id,
            'outlet_id' => $outlet->id,
            'customer_id' => null, // Walk-in customer
            'table_id' => null,
            'employee_id' => $employee->id,
            'type' => 'takeaway',
            'status' => 'completed',
            'subtotal' => 30000,
            'tax_amount' => 3000,
            'discount_amount' => 5000,
            'service_charge' => 0,
            'delivery_fee' => 0,
            'total' => 28000,
            'paid_amount' => 30000,
            'change_amount' => 2000,
            'payment_status' => 'paid',
            'notes' => 'No ice',
            'ordered_at' => $today->copy()->setTime(12, 15),
        ]);

        // Add items to order 2
        if ($products->count() > 1) {
            OrderItem::create([
                'order_id' => $order2->id,
                'product_id' => $products[1]->id,
                'quantity' => 1,
                'price' => 30000,
                'total' => 30000,
            ]);
        }

        // Order 3: Pending order
        $order3 = Order::create([
            'order_number' => 'ORD-' . date('Ymd') . '-003',
            'business_id' => $business->id,
            'outlet_id' => $outlet->id,
            'customer_id' => $customer->id,
            'table_id' => $table->id,
            'employee_id' => $employee->id,
            'type' => 'dine_in',
            'status' => 'pending',
            'subtotal' => 75000,
            'tax_amount' => 7500,
            'discount_amount' => 0,
            'service_charge' => 0,
            'delivery_fee' => 0,
            'total' => 82500,
            'paid_amount' => 0,
            'change_amount' => 0,
            'payment_status' => 'pending',
            'notes' => 'Large portion',
            'ordered_at' => $today->copy()->setTime(14, 0),
        ]);

        // Add items to order 3
        if ($products->count() > 2) {
            OrderItem::create([
                'order_id' => $order3->id,
                'product_id' => $products[2]->id,
                'quantity' => 3,
                'price' => 25000,
                'total' => 75000,
            ]);
        }

        // Order 4: Yesterday's order
        $yesterday = $today->copy()->subDay();
        $order4 = Order::create([
            'order_number' => 'ORD-' . $yesterday->format('Ymd') . '-001',
            'business_id' => $business->id,
            'outlet_id' => $outlet->id,
            'customer_id' => $customer->id,
            'table_id' => $table->id,
            'employee_id' => $employee->id,
            'type' => 'dine_in',
            'status' => 'completed',
            'subtotal' => 40000,
            'tax_amount' => 4000,
            'discount_amount' => 0,
            'service_charge' => 0,
            'delivery_fee' => 0,
            'total' => 44000,
            'paid_amount' => 44000,
            'change_amount' => 0,
            'payment_status' => 'paid',
            'notes' => 'Regular order',
            'ordered_at' => $yesterday->copy()->setTime(19, 30),
        ]);

        // Add items to order 4
        OrderItem::create([
            'order_id' => $order4->id,
            'product_id' => $products[0]->id,
            'quantity' => 2,
            'price' => 20000,
            'total' => 40000,
        ]);

        $this->command->info('Sample orders created successfully!');
        $this->command->info('Orders created:');
        $this->command->info('- ' . $order1->order_number . ' (Dine-in, Completed)');
        $this->command->info('- ' . $order2->order_number . ' (Takeaway, Completed)');
        $this->command->info('- ' . $order3->order_number . ' (Dine-in, Pending)');
        $this->command->info('- ' . $order4->order_number . ' (Yesterday, Completed)');
    }
}

