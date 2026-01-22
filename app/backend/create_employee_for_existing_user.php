<?php
/**
 * Script untuk membuat employee record untuk user yang sudah ada
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "👥 Create Employee for Existing User\n";
echo "====================================\n\n";

$email = 'salimkasir@gmail.com';

// 1. Cek user yang sudah ada
echo "1. 👤 Cek user yang sudah ada:\n";
$existingUser = User::where('email', $email)->first();
if (!$existingUser) {
    echo "   ❌ User tidak ditemukan!\n";
    exit;
}

echo "   ✅ User ditemukan:\n";
echo "   - ID: {$existingUser->id}\n";
echo "   - Name: {$existingUser->name}\n";
echo "   - Email: {$existingUser->email}\n";
echo "   - Role: {$existingUser->role}\n";

// 2. Cek apakah user sudah memiliki employee record
echo "\n2. 🔗 Cek apakah user sudah memiliki employee record:\n";
$existingEmployee = Employee::where('user_id', $existingUser->id)->first();
if ($existingEmployee) {
    echo "   ✅ User sudah memiliki employee record:\n";
    echo "   - Employee ID: {$existingEmployee->id}\n";
    echo "   - Code: {$existingEmployee->employee_code}\n";
    echo "   - Name: {$existingEmployee->name}\n";
    echo "   - Role: {$existingEmployee->role}\n";
    echo "   - Status: {$existingEmployee->status}\n";
    exit;
} else {
    echo "   ❌ User belum memiliki employee record\n";
}

// 3. Cek employee code terakhir
echo "\n3. 🔢 Cek employee code terakhir:\n";
$lastEmployee = Employee::where('business_id', 1)
    ->where('employee_code', 'like', 'EMP%')
    ->orderBy('employee_code', 'desc')
    ->first();

if ($lastEmployee) {
    preg_match('/EMP(\d+)/', $lastEmployee->employee_code, $matches);
    $lastNumber = (int)$matches[1];
    $nextNumber = $lastNumber + 1;
    $nextCode = 'EMP' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    echo "   - Code terakhir: {$lastEmployee->employee_code}\n";
    echo "   - Code berikutnya: {$nextCode}\n";
} else {
    $nextCode = 'EMP0001';
    echo "   - Code pertama: {$nextCode}\n";
}

// 4. Cek apakah code sudah ada
echo "\n4. 🔍 Cek apakah code {$nextCode} sudah ada:\n";
$existingCode = Employee::where('business_id', 1)->where('employee_code', $nextCode)->first();
if ($existingCode) {
    echo "   ❌ Code {$nextCode} sudah ada!\n";
    echo "   - Name: {$existingCode->name}\n";
    echo "   - Email: {$existingCode->email}\n";
    exit;
} else {
    echo "   ✅ Code {$nextCode} tersedia\n";
}

// 5. Buat employee record
echo "\n5. 👥 Membuat employee record:\n";
try {
    $employee = new Employee();
    $employee->business_id = 1;
    $employee->user_id = $existingUser->id;
    $employee->employee_code = $nextCode;
    $employee->name = $existingUser->name;
    $employee->email = $existingUser->email;
    $employee->phone = '081234567890';
    $employee->address = 'JI Mesjid III/6 Mampang Prapatan, Jakarta';
    $employee->salary = 0;
    $employee->commission_rate = 0;
    $employee->is_active = true;
    $employee->hired_at = now();
    $employee->save();

    echo "   ✅ Employee record created with ID: {$employee->id}\n";
    echo "   - Code: {$employee->employee_code}\n";
    echo "   - Name: {$employee->name}\n";
    echo "   - Email: {$employee->email}\n";
    echo "   - Is Active: {$employee->is_active}\n";
    echo "   - Hired At: {$employee->hired_at}\n";
    echo "   - User ID: {$employee->user_id}\n";
} catch (Exception $e) {
    echo "   ❌ Error creating employee record: " . $e->getMessage() . "\n";
    exit;
}

// 6. Verifikasi data
echo "\n6. ✅ Verifikasi data:\n";
$createdEmployee = Employee::with('user')->find($employee->id);
if ($createdEmployee) {
    echo "   - Employee ID: {$createdEmployee->id}\n";
    echo "   - Code: {$createdEmployee->employee_code}\n";
    echo "   - Name: {$createdEmployee->name}\n";
    echo "   - Email: {$createdEmployee->email}\n";
    echo "   - Phone: {$createdEmployee->phone}\n";
    echo "   - Is Active: {$createdEmployee->is_active}\n";
    echo "   - Hired At: {$createdEmployee->hired_at}\n";
    echo "   - User ID: {$createdEmployee->user_id}\n";
    echo "   - User Name: {$createdEmployee->user->name}\n";
    echo "   - User Email: {$createdEmployee->user->email}\n";
    echo "   - User Role: {$createdEmployee->user->role}\n";
} else {
    echo "   ❌ Employee tidak ditemukan setelah dibuat\n";
}

echo "\n✅ Employee record berhasil dibuat untuk user yang sudah ada!\n";
echo "📝 Informasi:\n";
echo "   - Email: {$email}\n";
echo "   - Employee Code: {$nextCode}\n";
echo "   - Role: Kasir\n";
echo "   - Status: Active\n";
?>
