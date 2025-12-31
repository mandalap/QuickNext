# 🔧 FIX: Perhitungan Gaji Berdasarkan Hari Kerja yang Ditentukan

**Tanggal:** 2025-12-31  
**Masalah:** Perhitungan gaji tidak akurat karena tidak mempertimbangkan hari kerja yang ditentukan

---

## 🐛 **MASALAH YANG DITEMUKAN**

### **Gejala:**
- Perhitungan gaji menggunakan asumsi 30 hari kerja per bulan
- Tidak ada konfigurasi hari kerja per outlet
- Absent penalty dihitung dengan `base_salary / 30` (tidak akurat)
- Gaji tidak dihitung berdasarkan hari masuk yang sebenarnya

### **Penyebab:**
1. **PayrollService.php:**
   - Menggunakan `$baseSalary / 30` untuk absent penalty (asumsi 30 hari)
   - Menggunakan `$baseSalary / 30 / 8` untuk overtime rate (asumsi 30 hari)
   - Tidak ada konfigurasi hari kerja per outlet
   - `totalWorkingDays` dihitung dari jumlah shift, bukan hari kerja yang ditentukan

2. **Outlet Model:**
   - Tidak ada field `working_days` untuk konfigurasi hari kerja

3. **Frontend:**
   - Tidak ada UI untuk konfigurasi hari kerja di Edit Outlet

---

## ✅ **PERBAIKAN YANG DILAKUKAN**

### **1. Migration: Tambah Field `working_days` ke Outlets Table**

**File:** `app/backend/database/migrations/2025_12_31_172630_add_working_days_to_outlets_table.php`

```php
Schema::table('outlets', function (Blueprint $table) {
    if (!Schema::hasColumn('outlets', 'working_days')) {
        $table->json('working_days')
            ->nullable()
            ->after('shift_malam_end')
            ->comment('Hari kerja outlet (1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu, 0=Minggu). Default: [1,2,3,4,5] untuk Senin-Jumat');
    }
});

// Set default working days for existing outlets (Monday-Friday)
\DB::table('outlets')->whereNull('working_days')->update([
    'working_days' => json_encode([1, 2, 3, 4, 5]) // Senin-Jumat
]);
```

### **2. Update Outlet Model**

**File:** `app/backend/app/Models/Outlet.php`

- Tambahkan `working_days` ke `$fillable`
- Tambahkan `'working_days' => 'array'` ke `$casts`

### **3. Update PayrollService: Hitung Berdasarkan Hari Kerja**

**File:** `app/backend/app/Services/PayrollService.php`

#### **3.1. Get Working Days Configuration**

```php
// ✅ NEW: Get working days configuration from outlet
$workingDays = [1, 2, 3, 4, 5]; // Default: Monday-Friday
$outlet = null;

// Try to get outlet from employee's primary outlet or first shift
$primaryOutlet = \App\Models\EmployeeOutlet::where('user_id', $employee->user_id)
    ->where('business_id', $employee->business_id)
    ->where('is_primary', true)
    ->first();

if ($primaryOutlet) {
    $outlet = Outlet::find($primaryOutlet->outlet_id);
} elseif ($shifts->isNotEmpty()) {
    // Fallback: get outlet from first shift
    $outlet = Outlet::find($shifts->first()->outlet_id);
}

if ($outlet && $outlet->working_days) {
    $workingDays = is_array($outlet->working_days) 
        ? $outlet->working_days 
        : json_decode($outlet->working_days, true);
    if (!is_array($workingDays) || empty($workingDays)) {
        $workingDays = [1, 2, 3, 4, 5]; // Fallback to default
    }
}
```

#### **3.2. Calculate Expected Working Days**

```php
// ✅ NEW: Calculate expected working days based on working_days configuration
$expectedWorkingDays = 0;
$currentDate = $periodStart->copy();
while ($currentDate->lte($periodEnd)) {
    $dayOfWeek = $currentDate->dayOfWeek; // 0=Sunday, 1=Monday, ..., 6=Saturday
    if (in_array($dayOfWeek, $workingDays)) {
        $expectedWorkingDays++;
    }
    $currentDate->addDay();
}
```

#### **3.3. Calculate Absent Days Based on Expected Working Days**

```php
// ✅ NEW: Calculate absent days based on expected working days
// Absent = Expected working days - Present days (excluding late, as late is still present)
$absentDays = max(0, $expectedWorkingDays - $presentDays);

// Total working days = expected working days (for payroll calculation)
$totalWorkingDays = $expectedWorkingDays;
```

#### **3.4. Update Absent Penalty Calculation**

**Sebelum:**
```php
$defaultAbsentPenalty = $baseSalary > 0 ? ($baseSalary / 30) : 50000;
```

**Sesudah:**
```php
// ✅ NEW: Calculate absent penalty based on expected working days, not fixed 30 days
// Absent penalty = 1 day salary = base salary / expected working days
$defaultAbsentPenalty = $baseSalary > 0 && $expectedWorkingDays > 0 
    ? ($baseSalary / $expectedWorkingDays) 
    : 50000; // Minimum Rp 50.000 if salary is 0 or no working days
```

#### **3.5. Update Overtime Rate Calculation**

**Sebelum:**
```php
$defaultOvertimeRate = $baseSalary > 0 ? ($baseSalary / 30 / 8 * 1.5) : 10000;
```

**Sesudah:**
```php
// ✅ NEW: Calculate overtime rate based on expected working days
// Hourly rate = base salary / (expected working days * 8 hours)
$defaultOvertimeRate = $baseSalary > 0 && $expectedWorkingDays > 0 
    ? ($baseSalary / ($expectedWorkingDays * 8) * 1.5) 
    : 10000; // Minimum Rp 10.000/hour if salary is 0 or no working days
```

#### **3.6. Pro-Rated Salary Based on Actual Attendance**

```php
// ✅ NEW: Calculate pro-rated salary based on actual attendance
// If employee worked less than expected days, calculate pro-rated salary
// Pro-rated salary = (base salary / expected working days) * present days
$proRatedBaseSalary = $baseSalary;
if ($expectedWorkingDays > 0 && $presentDays < $expectedWorkingDays) {
    // Only pro-rate if there are absent days
    $dailySalary = $baseSalary / $expectedWorkingDays;
    $proRatedBaseSalary = $dailySalary * $presentDays;
}

// Calculate totals
$grossSalary = $proRatedBaseSalary + $overtimePay + $commission + $bonus + $allowance;
```

### **4. Update Frontend: UI untuk Konfigurasi Hari Kerja**

**File:** `app/frontend/src/components/management/BusinessManagement.jsx`

#### **4.1. Tambahkan `working_days` ke FormData**

```javascript
const [formData, setFormData] = useState({
  // ... other fields ...
  working_days: [1, 2, 3, 4, 5], // Default: Senin-Jumat (1=Senin, 2=Selasa, ..., 0=Minggu)
});
```

#### **4.2. Tambahkan UI untuk Konfigurasi Hari Kerja**

```jsx
{/* ✅ NEW: Working Days Configuration */}
<div className='space-y-4 border-t pt-4 mt-4'>
  <div className='flex items-center gap-2 mb-2'>
    <Calendar className='w-5 h-5 text-green-600' />
    <h3 className='text-lg font-semibold'>Hari Kerja</h3>
  </div>
  <p className='text-sm text-gray-600 mb-4'>
    Pilih hari kerja untuk outlet ini. Gaji akan dihitung berdasarkan hari kerja yang ditentukan.
  </p>
  <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
    {[
      { value: 1, label: 'Senin', short: 'Sen' },
      { value: 2, label: 'Selasa', short: 'Sel' },
      { value: 3, label: 'Rabu', short: 'Rab' },
      { value: 4, label: 'Kamis', short: 'Kam' },
      { value: 5, label: 'Jumat', short: 'Jum' },
      { value: 6, label: 'Sabtu', short: 'Sab' },
      { value: 0, label: 'Minggu', short: 'Min' },
    ].map(day => (
      <label
        key={day.value}
        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
          formData.working_days?.includes(day.value)
            ? 'bg-green-50 border-green-300 text-green-900'
            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
        }`}
      >
        <input
          type='checkbox'
          checked={formData.working_days?.includes(day.value) || false}
          onChange={e => {
            const currentDays = formData.working_days || [];
            if (e.target.checked) {
              setFormData({
                ...formData,
                working_days: [...currentDays, day.value].sort((a, b) => a - b),
              });
            } else {
              setFormData({
                ...formData,
                working_days: currentDays.filter(d => d !== day.value),
              });
            }
          }}
          className='w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500'
        />
        <span className='text-sm font-medium'>{day.label}</span>
      </label>
    ))}
  </div>
  {(!formData.working_days || formData.working_days.length === 0) && (
    <p className='text-sm text-orange-600 mt-2'>
      ⚠️ Pilih minimal 1 hari kerja untuk perhitungan gaji yang akurat.
    </p>
  )}
</div>
```

#### **4.3. Update Load Outlet untuk Edit**

```javascript
working_days: outlet.working_days || [1, 2, 3, 4, 5], // Default: Senin-Jumat
```

---

## 📊 **CARA KERJA PERHITUNGAN BARU**

### **Contoh 1: Outlet dengan Senin-Jumat (5 hari kerja)**

**Konfigurasi:**
- Working Days: [1, 2, 3, 4, 5] (Senin-Jumat)
- Base Salary: Rp 3.000.000
- Periode: Januari 2025 (31 hari, 23 hari kerja Senin-Jumat)

**Perhitungan:**
- Expected Working Days: 23 hari
- Daily Salary: Rp 3.000.000 / 23 = Rp 130.435
- Jika Present Days: 20 hari
  - Pro-rated Base Salary: Rp 130.435 × 20 = Rp 2.608.700
  - Absent Days: 23 - 20 = 3 hari
  - Absent Penalty: Rp 130.435 × 3 = Rp 391.305
- Overtime Rate: (Rp 3.000.000 / 23 / 8) × 1.5 = Rp 24.457/jam

### **Contoh 2: Outlet dengan Senin-Sabtu (6 hari kerja)**

**Konfigurasi:**
- Working Days: [1, 2, 3, 4, 5, 6] (Senin-Sabtu)
- Base Salary: Rp 3.000.000
- Periode: Januari 2025 (31 hari, 27 hari kerja Senin-Sabtu)

**Perhitungan:**
- Expected Working Days: 27 hari
- Daily Salary: Rp 3.000.000 / 27 = Rp 111.111
- Jika Present Days: 25 hari
  - Pro-rated Base Salary: Rp 111.111 × 25 = Rp 2.777.775
  - Absent Days: 27 - 25 = 2 hari
  - Absent Penalty: Rp 111.111 × 2 = Rp 222.222
- Overtime Rate: (Rp 3.000.000 / 27 / 8) × 1.5 = Rp 20.833/jam

---

## 🔍 **CARA TESTING**

### **Test 1: Konfigurasi Hari Kerja**
1. Edit Outlet → Pilih hari kerja (misalnya Senin-Jumat)
2. Simpan perubahan
3. Verifikasi di database: `working_days` harus berisi `[1,2,3,4,5]`

### **Test 2: Perhitungan Gaji dengan Hari Kerja**
1. Set outlet dengan working days: Senin-Jumat (5 hari)
2. Generate payroll untuk karyawan dengan:
   - Base Salary: Rp 3.000.000
   - Present Days: 20 hari (dari 23 hari kerja yang diharapkan)
3. Verifikasi:
   - Expected Working Days: 23 hari
   - Pro-rated Base Salary: Rp 2.608.700 (20/23 × 3.000.000)
   - Absent Days: 3 hari
   - Absent Penalty: Rp 391.305 (3 × 130.435)

### **Test 3: Perhitungan dengan Hari Kerja Berbeda**
1. Set outlet dengan working days: Senin-Sabtu (6 hari)
2. Generate payroll untuk karyawan dengan:
   - Base Salary: Rp 3.000.000
   - Present Days: 25 hari (dari 27 hari kerja yang diharapkan)
3. Verifikasi:
   - Expected Working Days: 27 hari
   - Pro-rated Base Salary: Rp 2.777.775 (25/27 × 3.000.000)
   - Absent Days: 2 hari
   - Absent Penalty: Rp 222.222 (2 × 111.111)

---

## 📝 **CATATAN PENTING**

### **Mapping Hari:**
- 0 = Minggu (Sunday)
- 1 = Senin (Monday)
- 2 = Selasa (Tuesday)
- 3 = Rabu (Wednesday)
- 4 = Kamis (Thursday)
- 5 = Jumat (Friday)
- 6 = Sabtu (Saturday)

### **Default Working Days:**
- Default untuk outlet baru: [1, 2, 3, 4, 5] (Senin-Jumat)
- Outlet yang sudah ada akan di-update otomatis ke [1, 2, 3, 4, 5]

### **Perhitungan Gaji:**
1. **Expected Working Days:** Dihitung berdasarkan `working_days` dan periode (bulan)
2. **Pro-Rated Base Salary:** `(base_salary / expected_working_days) × present_days`
3. **Absent Penalty:** `(base_salary / expected_working_days) × absent_days`
4. **Overtime Rate:** `(base_salary / (expected_working_days × 8)) × 1.5`

### **Backward Compatibility:**
- Jika outlet tidak punya `working_days`, default ke [1, 2, 3, 4, 5] (Senin-Jumat)
- Jika `working_days` kosong atau invalid, default ke [1, 2, 3, 4, 5]

---

## 🚀 **DEPLOYMENT**

### **File yang Diubah:**
1. **Backend:**
   - `app/backend/database/migrations/2025_12_31_172630_add_working_days_to_outlets_table.php` (NEW)
   - `app/backend/app/Models/Outlet.php`
   - `app/backend/app/Services/PayrollService.php`

2. **Frontend:**
   - `app/frontend/src/components/management/BusinessManagement.jsx`

### **Migration:**
```bash
cd app/backend
php artisan migrate
```

### **Testing:**
1. Test konfigurasi hari kerja di Edit Outlet
2. Test perhitungan gaji dengan berbagai konfigurasi hari kerja
3. Test dengan outlet yang sudah ada (harus default ke Senin-Jumat)
4. Test dengan outlet baru (harus default ke Senin-Jumat)

---

## ✅ **STATUS**

- [x] Migration untuk tambah field `working_days`
- [x] Update Outlet Model
- [x] Update PayrollService untuk hitung berdasarkan hari kerja
- [x] Update Frontend UI untuk konfigurasi hari kerja
- [x] Update generatePayroll untuk simpan pro-rated salary
- [x] Testing migration
- [ ] Testing perhitungan gaji dengan berbagai konfigurasi
- [ ] Deploy ke production

---

**Generated:** 2025-12-31
