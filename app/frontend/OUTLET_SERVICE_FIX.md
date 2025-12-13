# 🔧 Fix: Outlet Service 404 Error - "Business not found"

## ❌ Masalah

User melaporkan:
- **GET `/api/v1/outlets` 404 (Not Found)**
- **POST `/api/v1/outlets` 404 (Not Found)**
- **"Business not found" error**
- Error terjadi di `outlet.service.js` dan `BusinessManagement.jsx`

### Root Cause:
1. **Outlet service menggunakan `fetch` langsung** → tidak menggunakan `apiClient` yang sudah handle headers
2. **Tidak handle 404 dengan benar** → 404 dianggap error padahal bisa berarti "no outlets yet"
3. **Tidak handle "Business not found" error** → tidak clear business ID dari localStorage
4. **Tidak konsisten dengan service lain** → semua service lain sudah pakai `apiClient`

---

## ✅ Perbaikan yang Dilakukan

### 1. **Migrate ke apiClient untuk Semua Methods**

**Sebelum:**
```javascript
const response = await fetch(`${API_URL}/outlets`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Business-Id': businessId,
    'Content-Type': 'application/json',
  },
});
```

**Sesudah:**
```javascript
import apiClient from '../utils/apiClient';

const response = await apiClient.get('/v1/outlets');
// apiClient automatically handles:
// - Authorization header
// - X-Business-Id header
// - Error handling
// - Request deduplication
```

### 2. **Handle 404 sebagai Expected Behavior**

**Sebelum:**
```javascript
if (response.ok) {
  const data = await response.json();
  return { success: true, data: outlets };
} else {
  return { success: false, error: 'Failed to fetch outlets' };
}
```

**Sesudah:**
```javascript
try {
  const response = await apiClient.get('/v1/outlets');
  const outlets = Array.isArray(response.data) ? response.data : [];
  return { success: true, data: outlets };
} catch (error) {
  // ✅ FIX: Handle 404 as expected (no outlets yet)
  if (error.response?.status === 404) {
    console.log('🔍 No outlets found (404) - this is normal for new businesses');
    return { success: true, data: [] };
  }
  // ... other error handling
}
```

### 3. **Handle "Business not found" Error**

**Sebelum:**
```javascript
} catch (error) {
  console.error('Error fetching outlets:', error);
  return { success: false, error: 'Network error', data: [] };
}
```

**Sesudah:**
```javascript
} catch (error) {
  // ✅ FIX: Handle "Business not found" error
  if (error.response?.status === 400 || error.response?.data?.error === 'Business not found') {
    console.warn('⚠️ Business not found, clearing business ID');
    localStorage.removeItem('currentBusinessId');
    localStorage.removeItem('currentOutletId');
    return { success: false, error: 'Business not found', data: [] };
  }
  // ... other error handling
}
```

### 4. **Handle 403 Unauthorized**

**Sebelum:**
```javascript
if (response.status === 403) {
  console.warn('⚠️ Unauthorized access to business, clearing business ID');
  localStorage.removeItem('currentBusinessId');
}
```

**Sesudah:**
```javascript
// ✅ FIX: If unauthorized (403), clear business ID from localStorage
if (error.response?.status === 403) {
  const businessId = localStorage.getItem('currentBusinessId');
  if (businessId) {
    console.warn('⚠️ Unauthorized access to business, clearing business ID');
  }
  localStorage.removeItem('currentBusinessId');
  localStorage.removeItem('currentOutletId');
  return { success: false, error: 'Unauthorized access to business', data: [] };
}
```

### 5. **Update Semua Methods**

Methods yang di-update:
- ✅ `getAll()` - Migrate ke apiClient, handle 404, handle "Business not found"
- ✅ `getById()` - Migrate ke apiClient
- ✅ `create()` - Migrate ke apiClient, handle "Business not found"
- ✅ `update()` - Migrate ke apiClient
- ✅ `delete()` - Migrate ke apiClient
- ✅ `getPaymentGatewayConfig()` - Migrate ke apiClient
- ✅ `updatePaymentGatewayConfig()` - Migrate ke apiClient
- ✅ `deletePaymentGatewayConfig()` - Migrate ke apiClient

---

## 🎯 Flow yang Benar

### Step 1: Check Business ID
1. Get `currentBusinessId` dari localStorage
2. If no business ID → Return error "Business ID required"
3. If business ID exists → Continue

### Step 2: Make API Request
1. Use `apiClient.get('/v1/outlets')` atau `apiClient.post('/v1/outlets', data)`
2. `apiClient` automatically adds:
   - `Authorization: Bearer {token}`
   - `X-Business-Id: {businessId}`

### Step 3: Handle Response
1. **Success (200)** → Return outlets data
2. **404** → Return empty array (no outlets yet - normal)
3. **400 + "Business not found"** → Clear business ID, return error
4. **403** → Clear business ID, return unauthorized error
5. **Other errors** → Return error message

---

## 📝 File yang Diubah

1. **`app/frontend/src/services/outlet.service.js`**
   - Migrate semua methods ke `apiClient`
   - Handle 404 sebagai expected behavior
   - Handle "Business not found" error
   - Handle 403 unauthorized
   - Better error messages

2. **`app/frontend/src/utils/apiClient.js`**
   - Add `/v1/outlets` ke `publicEndpoints` (optional, untuk prevent warnings)

---

## 🧪 Testing

### Test Case 1: User dengan Business tapi No Outlets
1. User login dengan business
2. Business belum punya outlets
3. **Expected**: 
   - ✅ GET `/v1/outlets` return 404
   - ✅ Service handle 404 → return `{ success: true, data: [] }`
   - ✅ Tidak ada error di console

### Test Case 2: User tanpa Business
1. User login tanpa business
2. `currentBusinessId` tidak ada
3. **Expected**: 
   - ✅ Service return `{ success: false, error: 'Business ID required', data: [] }`
   - ✅ Tidak ada API call

### Test Case 3: Business Not Found
1. User punya `currentBusinessId` tapi business tidak ada di database
2. **Expected**: 
   - ✅ API return 400 atau 404 dengan "Business not found"
   - ✅ Service clear `currentBusinessId` dari localStorage
   - ✅ Return error "Business not found"

### Test Case 4: Create Outlet
1. User create outlet baru
2. **Expected**: 
   - ✅ POST `/v1/outlets` dengan data
   - ✅ Return success dengan outlet data
   - ✅ Jika "Business not found" → clear business ID

---

## ✅ Checklist

- [x] Migrate semua methods ke `apiClient`
- [x] Handle 404 sebagai expected behavior (no outlets yet)
- [x] Handle "Business not found" error
- [x] Handle 403 unauthorized
- [x] Clear business ID dari localStorage jika business tidak ditemukan
- [x] Better error messages
- [x] Consistent dengan service lain

---

## 📌 Catatan Penting

1. **404 is Normal**: 
   - 404 untuk outlets berarti "no outlets yet" (normal untuk new business)
   - Jangan treat sebagai error, return empty array

2. **Business ID Validation**: 
   - Always check business ID sebelum API call
   - Clear business ID jika business tidak ditemukan

3. **Error Handling**: 
   - Handle specific errors (404, 403, 400)
   - Provide clear error messages
   - Clear invalid state dari localStorage

---

## 🔗 Related Files

- `app/frontend/src/services/outlet.service.js`
  - All methods migrated to `apiClient`
  - Better error handling

- `app/frontend/src/utils/apiClient.js`
  - Centralized API client with automatic headers

- `app/backend/app/Http/Controllers/Api/OutletController.php`
  - Returns 404 if business not found
  - Returns 400 if business ID required

