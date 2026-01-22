<?php

namespace Database\Seeders;

use App\Models\CashierShift;
use App\Models\Business;
use App\Models\Outlet;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CashierShiftSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $business = Business::first();
        $outlets = Outlet::where('business_id', $business->id)->get();
        $kasirs = User::where('role', 'kasir')->get();

        foreach ($outlets as $outlet) {
            foreach ($kasirs as $kasir) {
                // Create active shift for today
                CashierShift::create([
                    'business_id' => $business->id,
                    'outlet_id' => $outlet->id,
                    'user_id' => $kasir->id,
                    'employee_id' => null,
                    'shift_name' => 'Shift Pagi',
                    'status' => 'open',
                    'opened_at' => Carbon::today()->setHour(8),
                    'opening_balance' => 100000,
                    'opening_notes' => 'Shift pagi dimulai'
                ]);

                // Create closed shift for yesterday
                CashierShift::create([
                    'business_id' => $business->id,
                    'outlet_id' => $outlet->id,
                    'user_id' => $kasir->id,
                    'employee_id' => null,
                    'shift_name' => 'Shift Kemarin',
                    'status' => 'closed',
                    'opened_at' => Carbon::yesterday()->setHour(8),
                    'closed_at' => Carbon::yesterday()->setHour(17),
                    'opening_balance' => 100000,
                    'expected_cash' => 500000,
                    'expected_card' => 200000,
                    'expected_transfer' => 100000,
                    'expected_qris' => 150000,
                    'expected_total' => 950000,
                    'actual_cash' => 520000,
                    'actual_card' => 200000,
                    'actual_transfer' => 100000,
                    'actual_qris' => 150000,
                    'actual_total' => 970000,
                    'cash_difference' => 20000,
                    'total_difference' => 20000,
                    'total_transactions' => 15,
                    'cash_transactions' => 8,
                    'card_transactions' => 4,
                    'transfer_transactions' => 2,
                    'qris_transactions' => 1,
                    'closing_notes' => 'Shift kemarin selesai dengan baik'
                ]);

                // Create closed shift for 2 days ago
                CashierShift::create([
                    'business_id' => $business->id,
                    'outlet_id' => $outlet->id,
                    'user_id' => $kasir->id,
                    'employee_id' => null,
                    'shift_name' => 'Shift 2 Hari Lalu',
                    'status' => 'closed',
                    'opened_at' => Carbon::now()->subDays(2)->setHour(9),
                    'closed_at' => Carbon::now()->subDays(2)->setHour(18),
                    'opening_balance' => 150000,
                    'expected_cash' => 600000,
                    'expected_card' => 250000,
                    'expected_transfer' => 120000,
                    'expected_qris' => 180000,
                    'expected_total' => 1150000,
                    'actual_cash' => 580000,
                    'actual_card' => 250000,
                    'actual_transfer' => 120000,
                    'actual_qris' => 180000,
                    'actual_total' => 1130000,
                    'cash_difference' => -20000,
                    'total_difference' => -20000,
                    'total_transactions' => 22,
                    'cash_transactions' => 12,
                    'card_transactions' => 6,
                    'transfer_transactions' => 3,
                    'qris_transactions' => 1,
                    'closing_notes' => 'Shift 2 hari lalu dengan sedikit kekurangan kas'
                ]);
            }
        }

        echo "CashierShift seeded successfully!\n";
    }
}
