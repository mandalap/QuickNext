<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Business;
use App\Models\Employee;
use App\Models\EmployeeOutlet;
use App\Models\Outlet;

// Create employee records for test users
function createEmployeeRecords() {
    echo "👥 CREATING EMPLOYEE RECORDS\n";
    echo "============================\n\n";

    // Get the business
    $business = Business::find(1);
    if (!$business) {
        echo "❌ Business not found\n";
        return;
    }

    echo "🏢 Business: " . $business->name . " (ID: " . $business->id . ")\n\n";

    // Get or create outlet
    $outlet = Outlet::where('business_id', $business->id)->first();
    if (!$outlet) {
        $outlet = Outlet::create([
            'business_id' => $business->id,
            'name' => 'Outlet Utama',
            'address' => 'Jl. Test No. 1',
            'phone' => '081234567890',
            'is_active' => true,
        ]);
        echo "✅ Created outlet: " . $outlet->name . "\n";
    } else {
        echo "✅ Using existing outlet: " . $outlet->name . "\n";
    }

    // Employee users that need employee records
    $employeeUsers = [
        [
            'email' => 'admin@test.com',
            'role' => 'admin',
            'employee_code' => 'ADM001'
        ],
        [
            'email' => 'waiter@test.com',
            'role' => 'waiter',
            'employee_code' => 'WTR001'
        ],
        [
            'email' => 'superadmin@test.com',
            'role' => 'super_admin',
            'employee_code' => 'SAD001'
        ],
        [
            'email' => 'kasir1@gmail.com',
            'role' => 'kasir',
            'employee_code' => 'KSR001'
        ],
        [
            'email' => 'kasir2@gmail.com',
            'role' => 'kitchen',
            'employee_code' => 'KCH001'
        ]
    ];

    echo "\n👥 CREATING EMPLOYEE RECORDS:\n";
    foreach ($employeeUsers as $employeeData) {
        $user = User::where('email', $employeeData['email'])->first();

        if (!$user) {
            echo "❌ User not found: " . $employeeData['email'] . "\n";
            continue;
        }

        // Check if employee record already exists
        $existingEmployee = Employee::where('user_id', $user->id)
            ->where('business_id', $business->id)
            ->first();

        if ($existingEmployee) {
            echo "👤 Employee already exists: " . $user->name . " (" . $user->email . ")\n";
            echo "  Employee Code: " . $existingEmployee->employee_code . "\n";
            echo "  Status: " . ($existingEmployee->is_active ? 'Active' : 'Inactive') . "\n";
        } else {
            // Create employee record
            $employee = Employee::create([
                'business_id' => $business->id,
                'user_id' => $user->id,
                'employee_code' => $employeeData['employee_code'],
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '081234567890',
                'address' => $user->address ?? 'Address not set',
                'salary' => 0,
                'commission_rate' => 0,
                'is_active' => true,
                'hired_at' => now(),
            ]);

            echo "✅ Created employee: " . $user->name . " (" . $user->email . ")\n";
            echo "  Employee Code: " . $employee->employee_code . "\n";
            echo "  Role: " . $user->role . "\n";
        }

        // Create outlet assignment for kasir
        if ($user->role === 'kasir') {
            $existingAssignment = EmployeeOutlet::where('user_id', $user->id)
                ->where('business_id', $business->id)
                ->first();

            if (!$existingAssignment) {
                EmployeeOutlet::create([
                    'user_id' => $user->id,
                    'outlet_id' => $outlet->id,
                    'business_id' => $business->id,
                    'is_primary' => true,
                ]);
                echo "  ✅ Created outlet assignment\n";
            } else {
                echo "  ✅ Outlet assignment already exists\n";
            }
        }

        echo "  ---\n";
    }

    echo "\n📊 EMPLOYEE SUMMARY:\n";
    $employees = Employee::where('business_id', $business->id)->get();
    foreach ($employees as $employee) {
        echo "  " . $employee->name . " (" . $employee->email . ") - " . $employee->employee_code . " - " . ($employee->is_active ? 'Active' : 'Inactive') . "\n";
    }

    echo "\n🎯 OUTLET ASSIGNMENTS:\n";
    $assignments = EmployeeOutlet::where('business_id', $business->id)->get();
    foreach ($assignments as $assignment) {
        echo "  " . $assignment->user->name . " -> " . $assignment->outlet->name . " (Primary: " . ($assignment->is_primary ? 'Yes' : 'No') . ")\n";
    }

    echo "\n✅ EMPLOYEE RECORDS CREATED!\n";
}

// Run the function
createEmployeeRecords();

?>












































































