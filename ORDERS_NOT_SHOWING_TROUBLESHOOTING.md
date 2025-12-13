# 🔍 Orders Not Showing - Troubleshooting Guide

**Tanggal:** 2025-01-27  
**Status:** 🔧 DEBUGGING

---

## 📋 Masalah yang Dilaporkan

### **❌ Masalah:**

- Data pesanan tidak muncul di halaman penjualan
- Pagination sudah diperbaiki (5 data per halaman)
- Tidak ada error yang terlihat

---

## 🔧 Debugging Tools yang Ditambahkan

### **1. SalesManagementDebug Component**

**File:** `app/frontend/src/components/sales/SalesManagementDebug.jsx`

**Fitur Debug:**

- ✅ **User Info** - ID, name, role, email
- ✅ **Business/Outlet** - ID dan nama bisnis/outlet
- ✅ **Auth Status** - Token dan user data di localStorage
- ✅ **Component State** - Loading, error, orders count, pagination
- ✅ **API Response** - Response langsung dari salesService
- ✅ **Manual Test** - Button untuk test fetch orders
- ✅ **Clear Auth** - Button untuk clear localStorage dan reload

### **2. Enhanced Error Display**

**File:** `app/frontend/src/components/sales/SalesManagement.jsx`

**Fitur:**

- ✅ **Error Display** - Menampilkan error dengan jelas
- ✅ **Console Logging** - Log detail untuk debugging
- ✅ **Loading States** - Feedback loading yang jelas

---

## 🔍 Langkah Troubleshooting

### **Step 1: Periksa Debug Component**

1. **Buka halaman penjualan**
2. **Lihat debug component di atas**
3. **Periksa informasi berikut:**

#### **User Info:**

```json
{
  "id": 1,
  "name": "Owner Restoran",
  "role": "owner",
  "email": "owner@bintanglima.com"
}
```

#### **Business/Outlet:**

```json
{
  "business": {
    "id": 1,
    "name": "Restoran Bintang Lima"
  },
  "outlet": {
    "id": 1,
    "name": "Cabang Senayan"
  }
}
```

#### **Auth Status:**

```json
{
  "token": "Present",
  "userData": "Present"
}
```

### **Step 2: Periksa API Response**

**Lihat bagian "API Response" di debug component:**

#### **Response Normal:**

```json
{
  "success": true,
  "data": {
    "orders": [...],
    "current_page": 1,
    "last_page": 10,
    "total": 50,
    "per_page": 5
  }
}
```

#### **Response Error:**

```json
{
  "error": "Network error: Cannot connect to server",
  "details": {...}
}
```

### **Step 3: Periksa Console Logs**

**Buka Developer Tools (F12) → Console:**

#### **Logs Normal:**

```
🔄 Fetching orders with params: {page: 1, limit: 5, ...}
📊 Orders response: {success: true, data: {...}}
✅ Final orders data: {...}
📦 Orders array: [...]
```

#### **Logs Error:**

```
❌ Error fetching orders: AxiosError: Network Error
```

---

## 🚨 Kemungkinan Penyebab

### **1. Backend Server Tidak Berjalan**

- **Gejala:** API Response error "Cannot connect to server"
- **Solusi:** Pastikan backend server berjalan di port 8000

### **2. Authentication Issues**

- **Gejala:** Token missing atau invalid
- **Solusi:** Login ulang atau clear localStorage

### **3. Business/Outlet Not Set**

- **Gejala:** Business ID atau Outlet ID null
- **Solusi:** Pastikan user sudah memilih bisnis/outlet

### **4. API Endpoint Issues**

- **Gejala:** 404 atau 500 error
- **Solusi:** Periksa route dan controller backend

### **5. Database Issues**

- **Gejala:** API success tapi orders array kosong
- **Solusi:** Periksa data di database

---

## 🛠️ Solusi yang Dapat Dicoba

### **1. Restart Backend Server**

```bash
cd app/backend
php artisan serve --port=8000
```

### **2. Clear Frontend Cache**

```bash
cd app/frontend
npm run build
# atau
rm -rf node_modules/.cache
```

### **3. Check Database Connection**

```bash
cd app/backend
php artisan migrate:status
php artisan db:seed
```

### **4. Test API Directly**

```bash
curl -X GET "http://localhost:8000/api/v1/sales/orders?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1" \
  -H "X-Outlet-Id: 1"
```

### **5. Manual Test dengan Debug Component**

1. **Klik "Test Fetch Orders"** di debug component
2. **Lihat console logs**
3. **Periksa API response**

---

## 📊 Expected vs Actual

### **Expected Behavior:**

- ✅ Debug component menampilkan semua info
- ✅ API response success dengan data orders
- ✅ Orders array tidak kosong
- ✅ Pagination menampilkan "Menampilkan 1-5 dari X pesanan"

### **Actual Behavior (yang perlu diperbaiki):**

- ❌ Orders array kosong
- ❌ API response error
- ❌ Loading terus menerus
- ❌ Error message tidak jelas

---

## 🔧 Quick Fixes

### **1. Jika Backend Error:**

```javascript
// Di salesService.js - tambah error handling
.catch(error => {
  console.error('API Error:', error);
  if (error.code === 'ECONNREFUSED') {
    throw new Error('Backend server tidak berjalan. Pastikan server berjalan di port 8000.');
  }
  throw error;
});
```

### **2. Jika Auth Error:**

```javascript
// Di useSales.js - tambah auth check
if (!localStorage.getItem("token")) {
  setError("Token tidak ditemukan. Silakan login ulang.");
  return;
}
```

### **3. Jika Data Kosong:**

```javascript
// Di SalesManagement.jsx - tambah fallback
{
  orders?.length === 0 && !loading ? (
    <div className="text-center py-8">
      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600">Tidak ada pesanan ditemukan</p>
      <p className="text-sm text-gray-500 mt-2">
        Coba ubah filter atau refresh halaman
      </p>
    </div>
  ) : null;
}
```

---

## 📝 Next Steps

1. **Periksa debug component** untuk identifikasi masalah
2. **Lihat console logs** untuk detail error
3. **Test API langsung** jika perlu
4. **Apply quick fixes** sesuai masalah yang ditemukan
5. **Remove debug component** setelah masalah teratasi

---

## 🎯 Status

| Komponen                  | Status      | Keterangan                     |
| ------------------------- | ----------- | ------------------------------ |
| **Debug Component**       | ✅ Added    | Untuk troubleshooting          |
| **Error Display**         | ✅ Enhanced | Error handling yang lebih baik |
| **Console Logging**       | ✅ Added    | Log detail untuk debugging     |
| **API Testing**           | ✅ Added    | Manual test button             |
| **Troubleshooting Guide** | ✅ Created  | Panduan lengkap                |

**Status: 🔧 DEBUGGING - Gunakan debug component untuk identifikasi masalah**







































































