# Employee Role Selector Feature

**Tanggal:** 2025-10-10
**Status:** ✅ COMPLETED

---

## 🎯 Problem

Saat menambah karyawan, role otomatis jadi `member` padahal seharusnya bisa memilih role (kasir, kitchen, waiter, admin).

## ✅ Solution

Tambahkan dropdown selector untuk memilih role saat create/edit employee.

---

## 📝 Changes Made

### 1. Frontend - Employee Form Modal

**File:** `frontend/src/components/modals/EmployeeFormModal.jsx`

**Added:**
- Role field in formData with default `kasir`
- Role dropdown selector with 4 options
- Dynamic help text showing access permissions

```jsx
{/* Role */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Peran/Role <span className="text-red-500">*</span>
  </label>
  <select
    name="role"
    value={formData.role}
    onChange={handleChange}
    className="w-full px-3 py-2 border border-gray-300 rounded-md..."
  >
    <option value="admin">Admin - Kelola seluruh sistem</option>
    <option value="kasir">Kasir - Transaksi dan penjualan</option>
    <option value="kitchen">Dapur - Kelola pesanan masakan</option>
    <option value="waiter">Pelayan - Kelola meja dan pesanan</option>
  </select>
  <p className="text-xs text-gray-500 mt-1">
    {formData.role === 'admin' && '✓ Akses penuh ke semua fitur'}
    {formData.role === 'kasir' && '✓ Akses: Kasir, Penjualan, Self Service'}
    {formData.role === 'kitchen' && '✓ Akses: Dapur, Bahan & Resep'}
    {formData.role === 'waiter' && '✓ Akses: Meja, Self Service'}
  </p>
</div>
```

### 2. Backend - Employee Controller

**File:** `backend/app/Http/Controllers/Api/EmployeeController.php`

**Changes:**

#### In `store()` method:
1. Added role validation:
```php
'role' => 'required|in:admin,kasir,kitchen,waiter',
```

2. Set role when creating user:
```php
$user = User::create([
    'name' => $request->name,
    'email' => $request->email,
    'password' => Hash::make($request->password),
    'role' => $request->role, // Set role
]);
```

3. Update role when reusing existing user:
```php
if ($user) {
    $user->name = $request->name;
    $user->role = $request->role; // Update role
    // ...
}
```

#### In `update()` method:
1. Added role validation:
```php
'role' => 'sometimes|required|in:admin,kasir,kitchen,waiter',
```

2. Update user role:
```php
if ($request->has('role')) $userData['role'] = $request->role;
```

---

## 🎨 UI Preview

```
┌─────────────────────────────────────────────────────────────┐
│ Tambah Karyawan                                        [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Nama Lengkap *                                              │
│ [Siti Rahma                                         ]       │
│                                                              │
│ Email *                                                     │
│ [siti.rahma@email.com                               ]       │
│ Email ini akan digunakan untuk login ke sistem             │
│                                                              │
│ No. Telepon                                                 │
│ [081234567890                                       ]       │
│                                                              │
│ Password *                                                  │
│ [************                                       ] 👁     │
│                                                              │
│ Peran/Role *                                                │
│ [▼ Kasir - Transaksi dan penjualan                ]        │
│    ├─ Admin - Kelola seluruh sistem                        │
│    ├─ Kasir - Transaksi dan penjualan            ✓        │
│    ├─ Dapur - Kelola pesanan masakan                       │
│    └─ Pelayan - Kelola meja dan pesanan                    │
│ ✓ Akses: Kasir, Penjualan, Self Service                   │
│                                                              │
│ ... (other fields)                                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                      [Batal]  [Simpan]      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Use

### 1. Tambah Karyawan Baru

1. Buka menu **Karyawan**
2. Klik **Tambah Karyawan**
3. Isi form:
   - Nama: `Siti Rahma`
   - Email: `siti.rahma@email.com`
   - Password: `123456`
   - **Role: Pilih role yang sesuai** ⬅️ NEW!
4. Klik **Simpan**

### 2. Role Options & Access

| Role | Label | Access |
|------|-------|--------|
| **admin** | Admin - Kelola seluruh sistem | ✓ Dashboard, Kasir, Dapur, Meja, Penjualan, Produk, Bahan & Resep, Diskon & Promo, Self Service, Komisi Online, Karyawan, Keuangan, Laporan |
| **kasir** | Kasir - Transaksi dan penjualan | ✓ Kasir, Penjualan, Self Service |
| **kitchen** | Dapur - Kelola pesanan masakan | ✓ Dapur, Bahan & Resep |
| **waiter** | Pelayan - Kelola meja dan pesanan | ✓ Meja, Self Service |

### 3. Test Login dengan Role Berbeda

**Setelah create employee:**

1. **Kasir Login:**
   - Email: `siti.rahma@email.com`
   - Password: `123456`
   - Redirect: `/cashier` (Kasir Dashboard)
   - Menu: Kasir, Penjualan, Self Service

2. **Kitchen Login:**
   - Email: `chef@email.com`
   - Password: `123456`
   - Redirect: `/kitchen` (Kitchen Dashboard)
   - Menu: Dapur, Bahan & Resep

3. **Waiter Login:**
   - Email: `waiter@email.com`
   - Password: `123456`
   - Redirect: `/tables` (Waiter Dashboard)
   - Menu: Meja, Self Service

---

## ✅ Testing

### Test Case 1: Create Kasir
```
Input:
  Name: Test Kasir
  Email: kasir@test.com
  Password: 123456
  Role: kasir

Expected:
  ✓ Employee created
  ✓ User created with role='kasir'
  ✓ Login redirects to /cashier
  ✓ Only see kasir menus
```

### Test Case 2: Create Kitchen
```
Input:
  Name: Test Kitchen
  Email: kitchen@test.com
  Password: 123456
  Role: kitchen

Expected:
  ✓ Employee created
  ✓ User created with role='kitchen'
  ✓ Login redirects to /kitchen
  ✓ Only see kitchen menus
```

### Test Case 3: Create Waiter
```
Input:
  Name: Test Waiter
  Email: waiter@test.com
  Password: 123456
  Role: waiter

Expected:
  ✓ Employee created
  ✓ User created with role='waiter'
  ✓ Login redirects to /tables
  ✓ Only see waiter menus
```

### Test Case 4: Edit Employee Role
```
Action: Edit existing employee
Change: kasir → kitchen

Expected:
  ✓ Employee updated
  ✓ User role updated to 'kitchen'
  ✓ Next login shows kitchen dashboard
```

---

## 🔒 Validation

**Backend validates:**
- `role` is required when creating employee
- `role` must be one of: `admin`, `kasir`, `kitchen`, `waiter`
- Cannot set role to `owner` or `super_admin` (reserved)

---

## 📚 Related Documentation

- `ROLE_BASED_SYSTEM_IMPLEMENTATION.md` - Full role system docs
- `ROLE_BASED_SYSTEM_SUMMARY.md` - Quick reference
- `SETUP_ROLE_BASED_SYSTEM.md` - Setup guide

---

## 🎉 Result

Sekarang saat tambah karyawan:
- ✅ Ada dropdown pilih role
- ✅ Role otomatis di-set ke user account
- ✅ Employee bisa langsung login dengan role yang benar
- ✅ Redirect ke dashboard yang sesuai
- ✅ Menu yang tampil sesuai role

**Status:** ✅ WORKING

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
