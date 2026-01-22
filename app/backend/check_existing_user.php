<?php
/**
 * Script untuk memeriksa user yang sudah ada
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

echo "🔍 Check Existing User\n";
echo "======================\n\n";

$email = 'salimkasir@gmail.com';

// 1. Cek di tabel users
echo "1. 👤 Cek di tabel users:\n";
$existingUser = User::where('email', $email)->first();
if ($existingUser) {
    echo "   ✅ User ditemukan:\n";
    echo "   - ID: {$existingUser->id}\n";
    echo "   - Name: {$existingUser->name}\n";
    echo "   - Email: {$existingUser->email}\n";
    echo "   - Role: {$existingUser->role}\n";
    echo "   - Is Active: {$existingUser->is_active}\n";
    echo "   - Created: {$existingUser->created_at}\n";
} else {
    echo "   ❌ User tidak ditemukan\n";
}

// 2. Cek di tabel employees
echo "\n2. 👥 Cek di tabel employees:\n";
$existingEmployee = Employee::where('email', $email)->first();
if ($existingEmployee) {
    echo "   ✅ Employee ditemukan:\n";
    echo "   - ID: {$existingEmployee->id}\n";
    echo "   - Code: {$existingEmployee->employee_code}\n";
    echo "   - Name: {$existingEmployee->name}\n";
    echo "   - Email: {$existingEmployee->email}\n";
    echo "   - Role: {$existingEmployee->role}\n";
    echo "   - Status: {$existingEmployee->status}\n";
    echo "   - Business ID: {$existingEmployee->business_id}\n";
    echo "   - User ID: {$existingEmployee->user_id}\n";
} else {
    echo "   ❌ Employee tidak ditemukan\n";
}

// 3. Cek apakah user sudah memiliki employee record
if ($existingUser) {
    echo "\n3. 🔗 Cek apakah user sudah memiliki employee record:\n";
    $userEmployee = Employee::where('user_id', $existingUser->id)->first();
    if ($userEmployee) {
        echo "   ✅ User sudah memiliki employee record:\n";
        echo "   - Employee ID: {$userEmployee->id}\n";
        echo "   - Code: {$userEmployee->employee_code}\n";
        echo "   - Name: {$userEmployee->name}\n";
        echo "   - Role: {$userEmployee->role}\n";
        echo "   - Status: {$userEmployee->status}\n";
    } else {
        echo "   ❌ User belum memiliki employee record\n";
    }
}

// 4. Cek semua user dengan email yang mirip
echo "\n4. 🔍 Cek semua user dengan email yang mirip:\n";
$similarUsers = User::where('email', 'like', '%salim%')->get();
foreach ($similarUsers as $user) {
    echo "   - ID: {$user->id}, Name: {$user->name}, Email: {$user->email}, Role: {$user->role}\n";
}

// 5. Cek semua employee dengan email yang mirip
echo "\n5. 🔍 Cek semua employee dengan email yang mirip:\n";
$similarEmployees = Employee::where('email', 'like', '%salim%')->get();
foreach ($similarEmployees as $employee) {
    echo "   - ID: {$employee->id}, Code: {$employee->employee_code}, Name: {$employee->name}, Email: {$employee->email}, Role: {$employee->role}\n";
}

echo "\n✅ Check selesai!\n";
?>


























































