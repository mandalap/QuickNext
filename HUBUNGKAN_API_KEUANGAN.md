# 🔗 HUBUNGKAN API DASHBOARD KEUANGAN KE BACKEND

## 📋 **PERUBAHAN YANG DILAKUKAN**

### ✅ **1. Membuat Finance Service (Frontend)**

**File:** `app/frontend/src/services/finance.service.js`

Service baru untuk menghubungkan frontend ke API keuangan backend dengan method:

- `getFinancialSummary()` - Mendapatkan ringkasan keuangan (income, expense, net income)
- `getCashFlow()` - Mendapatkan cash flow report
- `getProfitLoss()` - Mendapatkan profit & loss statement
- `getBudgets()` - Mendapatkan data budget
- `exportReport()` - Export laporan keuangan

**Contoh Penggunaan:**

```javascript
import { financeService } from "../../services/finance.service";

const params = {
  start_date: "2024-10-01",
  end_date: "2024-10-22",
};

const result = await financeService.getFinancialSummary(params);
console.log(result.data);
```

### ✅ **2. Menambahkan Route Finance API (Backend)**

**File:** `app/backend/routes/api.php`

Menambahkan route group `/finance` untuk API keuangan:

```php
// Finance API
Route::prefix('finance')->group(function () {
    Route::get('/summary', [FinanceController::class, 'getFinancialSummary']);
    Route::get('/cash-flow', [FinanceController::class, 'getCashFlow']);
    Route::get('/profit-loss', [FinanceController::class, 'getProfitLoss']);
});
```

**Endpoint yang tersedia:**

- `GET /api/v1/finance/summary` - Ringkasan keuangan
- `GET /api/v1/finance/cash-flow` - Laporan cash flow
- `GET /api/v1/finance/profit-loss` - Laporan profit & loss

### ✅ **3. Menambahkan Recent Expenses di Finance Controller**

**File:** `app/backend/app/Http/Controllers/Api/FinanceController.php`

Menambahkan recent_expenses ke response API:

```php
// Get recent expenses
$recentExpenses = Expense::where('business_id', $businessId)
    ->whereBetween('date', [$startDate, $endDate])
    ->when($outletId, function ($query) use ($outletId) {
        return $query->where('outlet_id', $outletId);
    })
    ->latest('date')
    ->take(10)
    ->get()
    ->map(function ($expense) {
        return [
            'id' => $expense->id,
            'transaction_number' => $expense->reference_number ?? 'EXP-' . $expense->id,
            'description' => $expense->description,
            'amount' => $expense->amount,
            'category' => $expense->category,
            'payment_method' => $expense->payment_method ?? 'Cash',
            'created_at' => $expense->date,
            'status' => 'completed',
            'supplier' => $expense->supplier ?? '-',
        ];
    });
```

### ✅ **4. Update FinancialManagement Component (Frontend)**

**File:** `app/frontend/src/components/financial/FinancialManagement.jsx`

**Perubahan:**

1. **Import finance service:**

   ```javascript
   import { financeService } from "../../services/finance.service";
   ```

2. **Menggunakan API real untuk load data:**

   ```javascript
   const financialResult = await Promise.race([
     financeService.getFinancialSummary(params),
     timeoutPromise,
   ]);
   ```

3. **Menghapus mock data notifications:**

   - ❌ `toast.warning('Menampilkan data demo (API belum tersedia)')`
   - ✅ `toast.success('Data keuangan dimuat dari server')`
   - ✅ `toast.error('Gagal memuat data keuangan. Silakan refresh halaman.')`

4. **Retry logic:**
   - Jika gagal load data, otomatis retry 2x dengan delay 1 detik
   - Setelah max retries, fallback ke mock data dengan error message

## 🔍 **STRUKTUR DATA API**

### Response dari `/api/v1/finance/summary`:

```json
{
  "success": true,
  "data": {
    "income": {
      "today": 5000000,
      "this_week": 25000000,
      "this_month": 67500000,
      "growth": 12.5
    },
    "expense": {
      "today": 2500000,
      "this_week": 12500000,
      "this_month": 36950000,
      "growth": 8.3
    },
    "net_income": {
      "today": 2500000,
      "this_week": 12500000,
      "this_month": 30550000,
      "growth": 15.2
    },
    "cash_balance": 150000000,
    "recent_transactions": [
      {
        "id": 1,
        "transaction_number": "TXN-2024-001",
        "customer_name": "Walk-in Customer",
        "amount": 150000,
        "payment_method": "cash",
        "created_at": "2024-10-22T10:30:00",
        "status": "completed",
        "cashier": "Admin"
      }
    ],
    "recent_expenses": [
      {
        "id": 101,
        "transaction_number": "EXP-2024-001",
        "description": "Pembelian Bahan Baku",
        "amount": 500000,
        "category": "Bahan Baku",
        "payment_method": "Transfer",
        "created_at": "2024-10-22",
        "status": "completed",
        "supplier": "Supplier ABC"
      }
    ]
  }
}
```

## 🚀 **CARA TESTING**

### 1. **Test di Browser:**

1. Login sebagai owner/admin
2. Navigasi ke menu **Keuangan**
3. Buka Developer Tools (F12) → Console tab
4. Lihat log:
   - `📊 Fetching financial summary with params:` - Request sedang dikirim
   - `✅ Financial data loaded successfully:` - Data berhasil dimuat
   - `Data keuangan dimuat dari server` - Toast notification sukses

### 2. **Test API dengan Postman:**

```http
GET http://localhost:8000/api/v1/finance/summary
Headers:
  Authorization: Bearer {your_token}
  X-Business-Id: {business_id}
  X-Outlet-Id: {outlet_id} (optional)

Query Params:
  start_date: 2024-10-01
  end_date: 2024-10-22
```

### 3. **Check Backend Logs:**

```bash
cd app/backend
tail -f storage/logs/laravel.log
```

Cari log dengan keyword:

- `FinanceController: getFinancialSummary`
- `Financial summary response`

## 📊 **FITUR YANG SUDAH TERSEDIA**

### ✅ **Dashboard Keuangan:**

1. **Total Pendapatan** - Real-time dari orders yang sudah dibayar
2. **Total Pengeluaran** - Real-time dari expense table
3. **Laba Bersih** - Kalkulasi otomatis (Pendapatan - Pengeluaran)
4. **Saldo Kas** - Total cash dari shifts yang sudah ditutup
5. **Recent Transactions** - 10 transaksi penjualan terakhir
6. **Recent Expenses** - 10 pengeluaran terakhir

### ✅ **Filter & Date Range:**

- Today (Hari ini)
- This Week (Minggu ini)
- This Month (Bulan ini)
- Custom range

### ✅ **Growth Indicators:**

- Persentase pertumbuhan untuk income, expense, dan net income
- Warna indicator: Hijau (positif), Merah (negatif)

## 🔒 **RBAC & SECURITY**

### **Role Access:**

- ✅ **Owner** - Full access ke semua data keuangan
- ✅ **Admin** - Full access ke data keuangan business-nya
- ❌ **Kasir** - No access (kecuali shift report)
- ❌ **Kitchen** - No access
- ❌ **Waiter** - No access

### **Data Filtering:**

- Data otomatis di-filter berdasarkan `X-Business-Id` header
- Jika `X-Outlet-Id` disediakan, data di-filter per outlet
- User hanya bisa akses data business mereka sendiri

## ⚠️ **CATATAN PENTING**

1. **Cache:** Setelah update route, selalu jalankan:

   ```bash
   cd app/backend
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   ```

2. **Import Path:** Pastikan import apiClient menggunakan path yang benar:

   ```javascript
   // ✅ BENAR
   import apiClient from "../utils/apiClient";

   // ❌ SALAH
   import apiClient from "./apiClient";
   ```

3. **Date Range:** API menggunakan format `YYYY-MM-DD` (ISO 8601)

4. **Timeout:** Request timeout diset 10 detik untuk mencegah hanging

5. **Retry Logic:** Otomatis retry 2x jika gagal, delay 1 detik

6. **Fallback:** Jika semua retry gagal, fallback ke mock data dengan error message

## 🔧 **TROUBLESHOOTING**

### **Error: Module not found: Can't resolve './apiClient'**

**Penyebab:** Import path salah di finance.service.js
**Solusi:**

```javascript
// Ganti dari:
import apiClient from "./apiClient";

// Menjadi:
import apiClient from "../utils/apiClient";
```

### **Error: Route not found**

**Penyebab:** Route cache belum di-clear
**Solusi:**

```bash
cd app/backend
php artisan route:clear
php artisan cache:clear
```

### **Error: 401 Unauthorized**

**Penyebab:** Token expired atau tidak ada
**Solusi:**

1. Login ulang
2. Check localStorage untuk token
3. Check X-Business-Id header

## 📈 **ROADMAP NEXT FEATURES**

### 🚧 **Dalam Pengembangan:**

- [ ] Budget tracking & alerts
- [ ] Tax management & calculation
- [ ] Profit margin analysis per product/category
- [ ] Cash flow forecasting
- [ ] Export to PDF/Excel

### 💡 **Ideas:**

- [ ] Dashboard keuangan per outlet
- [ ] Comparison view (bulan ini vs bulan lalu)
- [ ] Financial charts & visualizations
- [ ] Automated financial reports via email

---

**Status:** ✅ **API KEUANGAN SUDAH TERHUBUNG!**  
**Next Step:** Test aplikasi dan verifikasi data yang ditampilkan sudah benar.

**Jika ada pertanyaan atau issue, silakan check:**

1. Console logs di browser (F12)
2. Backend logs di `storage/logs/laravel.log`
3. Network tab di Developer Tools untuk melihat request/response API
