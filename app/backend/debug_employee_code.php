<?php
/**
 * Debug script untuk memeriksa employee code yang sudah ada
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Employee;
use Illuminate\Support\Facades\DB;

echo "🔍 Debug Employee Code\n";
echo "=====================\n\n";

// 1. Cek semua employee codes yang sudah ada
echo "1. 📋 Employee Codes yang sudah ada:\n";
$employees = Employee::where('business_id', 1)->orderBy('employee_code')->get();
foreach ($employees as $employee) {
    echo "   - Code: {$employee->employee_code}, Name: {$employee->name}, Email: {$employee->email}\n";
}

// 2. Cek employee code EMP0016 secara khusus
echo "\n2. 🔍 Employee Code EMP0016:\n";
$emp0016 = Employee::where('business_id', 1)->where('employee_code', 'EMP0016')->first();
if ($emp0016) {
    echo "   ✅ EMP0016 sudah ada:\n";
    echo "   - ID: {$emp0016->id}\n";
    echo "   - Name: {$emp0016->name}\n";
    echo "   - Email: {$emp0016->email}\n";
    echo "   - Role: {$emp0016->role}\n";
    echo "   - Status: {$emp0016->status}\n";
} else {
    echo "   ❌ EMP0016 tidak ditemukan\n";
}

// 3. Cari employee code terakhir
echo "\n3. 🔢 Employee Code terakhir:\n";
$lastEmployee = Employee::where('business_id', 1)
    ->where('employee_code', 'like', 'EMP%')
    ->orderBy('employee_code', 'desc')
    ->first();

if ($lastEmployee) {
    echo "   - Code terakhir: {$lastEmployee->employee_code}\n";

    // Extract number dari code terakhir
    preg_match('/EMP(\d+)/', $lastEmployee->employee_code, $matches);
    if (isset($matches[1])) {
        $lastNumber = (int)$matches[1];
        $nextNumber = $lastNumber + 1;
        $nextCode = 'EMP' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        echo "   - Code berikutnya: {$nextCode}\n";
    }
} else {
    echo "   ❌ Tidak ada employee code yang ditemukan\n";
    $nextCode = 'EMP0001';
    echo "   - Code pertama: {$nextCode}\n";
}

// 4. Cek apakah ada email yang sama
echo "\n4. 📧 Cek email salimkasir@gmail.com:\n";
$existingEmail = Employee::where('email', 'salimkasir@gmail.com')->first();
if ($existingEmail) {
    echo "   ❌ Email salimkasir@gmail.com sudah digunakan oleh:\n";
    echo "   - Code: {$existingEmail->employee_code}\n";
    echo "   - Name: {$existingEmail->name}\n";
    echo "   - Business ID: {$existingEmail->business_id}\n";
} else {
    echo "   ✅ Email salimkasir@gmail.com tersedia\n";
}

// 5. Cek constraint unique
echo "\n5. 🔒 Cek constraint unique:\n";
try {
    $constraints = DB::select("
        SELECT
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE
            TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'employees'
            AND CONSTRAINT_NAME LIKE '%unique%'
    ");

    foreach ($constraints as $constraint) {
        echo "   - Constraint: {$constraint->CONSTRAINT_NAME}\n";
        echo "     Column: {$constraint->COLUMN_NAME}\n";
    }
} catch (Exception $e) {
    echo "   Error checking constraints: " . $e->getMessage() . "\n";
}

echo "\n✅ Debug selesai!\n";
?>


























































