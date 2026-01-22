<?php
/**
 * Script untuk menambahkan kasir baru dengan aman
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

echo "👤 Add New Cashier\n";
echo "==================\n\n";

// 1. Cek employee code terakhir
echo "1. 🔢 Cek employee code terakhir:\n";
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

// 2. Cek apakah code sudah ada
echo "\n2. 🔍 Cek apakah code {$nextCode} sudah ada:\n";
$existingCode = Employee::where('business_id', 1)->where('employee_code', $nextCode)->first();
if ($existingCode) {
    echo "   ❌ Code {$nextCode} sudah ada!\n";
    echo "   - Name: {$existingCode->name}\n";
    echo "   - Email: {$existingCode->email}\n";
    exit;
} else {
    echo "   ✅ Code {$nextCode} tersedia\n";
}

// 3. Cek email
$email = 'salimkasir@gmail.com';
echo "\n3. 📧 Cek email {$email}:\n";
$existingEmail = Employee::where('email', $email)->first();
if ($existingEmail) {
    echo "   ❌ Email {$email} sudah digunakan!\n";
    echo "   - Code: {$existingEmail->employee_code}\n";
    echo "   - Name: {$existingEmail->name}\n";
    exit;
} else {
    echo "   ✅ Email {$email} tersedia\n";
}

// 4. Buat user baru
echo "\n4. 👤 Membuat user baru:\n";
try {
    $user = new User();
    $user->name = 'Ita Amalia Mawaddah';
    $user->email = $email;
    $user->password = Hash::make('password123'); // Default password
    $user->role = 'kasir';
    $user->is_active = true;
    $user->save();

    echo "   ✅ User created with ID: {$user->id}\n";
} catch (Exception $e) {
    echo "   ❌ Error creating user: " . $e->getMessage() . "\n";
    exit;
}

// 5. Buat employee baru
echo "\n5. 👥 Membuat employee baru:\n";
try {
    $employee = new Employee();
    $employee->business_id = 1;
    $employee->user_id = $user->id;
    $employee->employee_code = $nextCode;
    $employee->name = 'Ita Amalia Mawaddah';
    $employee->email = $email;
    $employee->phone = '081234567890';
    $employee->address = 'JI Mesjid III/6 Mampang Prapatan, Jakarta';
    $employee->role = 'kasir';
    $employee->salary = 0;
    $employee->commission = 0;
    $employee->join_date = now();
    $employee->status = 'active';
    $employee->save();

    echo "   ✅ Employee created with ID: {$employee->id}\n";
    echo "   - Code: {$employee->employee_code}\n";
    echo "   - Name: {$employee->name}\n";
    echo "   - Email: {$employee->email}\n";
    echo "   - Role: {$employee->role}\n";
    echo "   - Status: {$employee->status}\n";
} catch (Exception $e) {
    echo "   ❌ Error creating employee: " . $e->getMessage() . "\n";

    // Rollback user jika employee gagal dibuat
    $user->delete();
    echo "   🔄 User rolled back\n";
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
    echo "   - Role: {$createdEmployee->role}\n";
    echo "   - Status: {$createdEmployee->status}\n";
    echo "   - User ID: {$createdEmployee->user_id}\n";
    echo "   - User Name: {$createdEmployee->user->name}\n";
    echo "   - User Email: {$createdEmployee->user->email}\n";
    echo "   - User Role: {$createdEmployee->user->role}\n";
} else {
    echo "   ❌ Employee tidak ditemukan setelah dibuat\n";
}

echo "\n✅ Kasir baru berhasil ditambahkan!\n";
echo "📝 Informasi login:\n";
echo "   - Email: {$email}\n";
echo "   - Password: password123 (default)\n";
echo "   - Role: Kasir\n";
echo "   - Employee Code: {$nextCode}\n";
?>













