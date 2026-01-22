<?php
/**
 * Script untuk mencari employee code yang tersedia
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Employee;
use Illuminate\Support\Facades\DB;

echo "🔍 Find Available Employee Code\n";
echo "================================\n\n";

// 1. Cek semua employee codes yang sudah ada
echo "1. 📋 Employee Codes yang sudah ada:\n";
$employees = Employee::where('business_id', 1)->orderBy('employee_code')->get();
foreach ($employees as $employee) {
    echo "   - Code: {$employee->employee_code}, Name: {$employee->name}, Email: {$employee->email}\n";
}

// 2. Cari code yang tersedia
echo "\n2. 🔍 Mencari code yang tersedia:\n";
$maxAttempts = 20;
$foundCode = null;

for ($i = 1; $i <= $maxAttempts; $i++) {
    $testCode = 'EMP' . str_pad($i, 4, '0', STR_PAD_LEFT);
    $existing = Employee::where('business_id', 1)->where('employee_code', $testCode)->first();

    if (!$existing) {
        $foundCode = $testCode;
        echo "   ✅ Code {$testCode} tersedia!\n";
        break;
    } else {
        echo "   ❌ Code {$testCode} sudah ada (Name: {$existing->name})\n";
    }
}

if (!$foundCode) {
    echo "   ❌ Tidak ada code yang tersedia dalam range EMP0001-EMP0020\n";
    exit;
}

// 3. Cek apakah code benar-benar tersedia
echo "\n3. ✅ Verifikasi code {$foundCode}:\n";
$verifyCode = Employee::where('business_id', 1)->where('employee_code', $foundCode)->first();
if (!$verifyCode) {
    echo "   ✅ Code {$foundCode} benar-benar tersedia\n";
} else {
    echo "   ❌ Code {$foundCode} ternyata sudah ada!\n";
    exit;
}

// 4. Buat employee dengan code yang tersedia
echo "\n4. 👥 Membuat employee dengan code {$foundCode}:\n";
$email = 'salimkasir@gmail.com';
$existingUser = \App\Models\User::where('email', $email)->first();

if (!$existingUser) {
    echo "   ❌ User tidak ditemukan!\n";
    exit;
}

try {
    $employee = new Employee();
    $employee->business_id = 1;
    $employee->user_id = $existingUser->id;
    $employee->employee_code = $foundCode;
    $employee->name = $existingUser->name;
    $employee->email = $existingUser->email;
    $employee->phone = '081234567890';
    $employee->address = 'JI Mesjid III/6 Mampang Prapatan, Jakarta';
    $employee->salary = 0;
    $employee->commission_rate = 0;
    $employee->is_active = true;
    $employee->hired_at = now();
    $employee->save();

    echo "   ✅ Employee berhasil dibuat!\n";
    echo "   - ID: {$employee->id}\n";
    echo "   - Code: {$employee->employee_code}\n";
    echo "   - Name: {$employee->name}\n";
    echo "   - Email: {$employee->email}\n";
    echo "   - Phone: {$employee->phone}\n";
    echo "   - Is Active: {$employee->is_active}\n";
    echo "   - Hired At: {$employee->hired_at}\n";
    echo "   - User ID: {$employee->user_id}\n";
} catch (Exception $e) {
    echo "   ❌ Error creating employee: " . $e->getMessage() . "\n";
    exit;
}

echo "\n✅ Kasir baru berhasil ditambahkan!\n";
echo "📝 Informasi:\n";
echo "   - Email: {$email}\n";
echo "   - Employee Code: {$foundCode}\n";
echo "   - Role: Kasir\n";
echo "   - Status: Active\n";
?>













