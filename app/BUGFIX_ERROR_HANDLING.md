# Bug Fix: Error Message Handling

**Tanggal:** 2025-10-10
**Status:** ✅ FIXED

---

## 🐛 Masalah Utama

### Error: "Gagal menyimpan bahan baku - Terjadi kesalahan saat menyimpan bahan baku"

**Gejala:**
- User melihat error message generic tanpa detail
- Tidak ada informasi spesifik tentang apa yang salah
- Modal tetap terbuka tapi tidak ada petunjuk untuk fix

**Masalah yang Ditemukan:**

1. **Mismatch Property Error Response**
   - Error handler mengembalikan property `error`
   - Kode component mengecek property `message`
   - Akibatnya: error detail hilang, hanya tampil fallback message

2. **Kurang Logging untuk Debugging**
   - Tidak ada log detail saat create/update ingredient
   - Sulit untuk trace API call dan response
   - Tidak ada visibility ke validation errors dari backend

3. **Error Messages Kurang Spesifik**
   - Tidak ada special handling untuk Business ID error
   - Network errors kurang jelas
   - Validation errors dari Laravel tidak terformat dengan baik

---

## ✅ Solusi Yang Diterapkan

### 1. Fix Error Property Mismatch

**File:** `frontend/src/components/InventoryRecipe.jsx`

**Before:**
```javascript
} else {
  toast.error(result.message || 'Gagal menyimpan bahan baku');
  throw new Error(result.message);
}
```

**After:**
```javascript
} else {
  // Error handler returns 'error' property, not 'message'
  const errorMessage = result.error || result.message || 'Gagal menyimpan bahan baku';
  toast.error(errorMessage);
  throw new Error(errorMessage);
}
```

**Changes:**
- ✅ Check `result.error` first (dari error handler)
- ✅ Fallback ke `result.message` untuk backward compatibility
- ✅ Final fallback ke message default
- ✅ Diterapkan di semua handler: `handleSaveIngredient`, `handleSaveRecipe`, `loadIngredients`, `loadRecipes`, `handleDeleteIngredient`, `handleDeleteRecipe`

---

### 2. Enhanced Logging di Service Layer

**File:** `frontend/src/services/ingredient.service.js`

**Create Method - Before:**
```javascript
create: async ingredientData => {
  try {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.INGREDIENTS.CREATE,
      ingredientData
    );
    return { success: true, data: response.data };
  } catch (error) {
    return handleApiError(error);
  }
},
```

**Create Method - After:**
```javascript
create: async ingredientData => {
  try {
    console.log('📝 Creating ingredient:', ingredientData);
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.INGREDIENTS.CREATE,
      ingredientData
    );
    console.log('✅ Ingredient created:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Create ingredient error:', error.response?.data || error);
    return handleApiError(error);
  }
},
```

**Changes:**
- ✅ Log request payload before sending
- ✅ Log successful response
- ✅ Log detailed error including response data
- ✅ Diterapkan juga di `update` method

---

### 3. Improved Error Handler

**File:** `frontend/src/utils/errorHandler.js`

**Before:**
```javascript
export const handleApiError = error => {
  if (error.response) {
    const { data, status } = error.response;

    if (status === 422 && data.errors) {
      return {
        success: false,
        error: Object.values(data.errors).flat().join(', '),
        errors: data.errors,
        status,
      };
    }

    return {
      success: false,
      error: data.message || 'Terjadi kesalahan pada server',
      status,
    };
  }

  if (error.request) {
    return {
      success: false,
      error: 'Tidak dapat terhubung ke server',
    };
  }

  return {
    success: false,
    error: error.message || 'Terjadi kesalahan',
  };
};
```

**After:**
```javascript
export const handleApiError = error => {
  console.log('🔍 Error details:', {
    hasResponse: !!error.response,
    hasRequest: !!error.request,
    message: error.message,
    response: error.response?.data,
    status: error.response?.status
  });

  if (error.response) {
    const { data, status } = error.response;

    // Laravel validation errors
    if (status === 422 && data.errors) {
      const validationErrors = Object.values(data.errors).flat();
      console.log('⚠️ Validation errors:', validationErrors);
      return {
        success: false,
        error: validationErrors.join(', '),
        errors: data.errors,
        status,
      };
    }

    // Business ID missing error
    if (status === 400 && data.message && data.message.includes('Business ID')) {
      console.error('❌ Business ID error:', data.message);
      return {
        success: false,
        error: 'Business ID tidak ditemukan. Silakan login ulang.',
        status,
      };
    }

    const errorMessage = data.message || data.error || 'Terjadi kesalahan pada server';
    console.error('❌ Server error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      status,
    };
  }

  if (error.request) {
    console.error('❌ Network error: Tidak dapat terhubung ke server');
    return {
      success: false,
      error: 'Tidak dapat terhubung ke server. Pastikan server backend berjalan.',
    };
  }

  console.error('❌ Unknown error:', error.message);
  return {
    success: false,
    error: error.message || 'Terjadi kesalahan',
  };
};
```

**Changes:**
- ✅ Added detailed logging at entry point
- ✅ Log validation errors specifically
- ✅ Special handling for Business ID errors dengan message yang lebih jelas
- ✅ Check both `data.message` and `data.error` untuk kompatibilitas
- ✅ Better network error message dengan petunjuk action
- ✅ Comprehensive logging untuk semua error paths

---

## 🔍 Debugging Guide

### Cara Debug Error Saat Save Ingredient:

1. **Buka Browser Console** (F12 → Console tab)

2. **Cek Request Payload:**
   ```
   📝 Creating ingredient: {name: "...", unit: "kg", ...}
   ```

3. **Cek Request/Response:**
   ```
   📤 Request: POST /api/v1/ingredients
   ✅ Response: 201 /api/v1/ingredients
   ```

4. **Jika Error, Lihat Detail:**
   ```
   🔍 Error details: {
     hasResponse: true,
     status: 422,
     response: {errors: {...}}
   }
   ```

5. **Error Types:**

   - **Validation Error (422):**
     ```
     ⚠️ Validation errors: ["Nama bahan harus diisi", "Harga per unit harus >= 0"]
     ```
     **Action:** Fix form input sesuai validation message

   - **Business ID Error (400):**
     ```
     ❌ Business ID error: Business ID required
     ```
     **Action:** Login ulang untuk refresh business ID

   - **Network Error:**
     ```
     ❌ Network error: Tidak dapat terhubung ke server
     ```
     **Action:** Pastikan backend server running di `localhost:8000`

   - **Server Error (500):**
     ```
     ❌ Server error: Internal server error
     ```
     **Action:** Cek Laravel log di `backend/storage/logs/laravel.log`

---

## 📝 Files Modified

1. **`frontend/src/components/InventoryRecipe.jsx`**
   - Fixed error property mismatch di 6 handler functions
   - Now checks `result.error` first, then `result.message`

2. **`frontend/src/services/ingredient.service.js`**
   - Added comprehensive logging di `create` dan `update` methods
   - Logs request payload, success response, dan error details

3. **`frontend/src/utils/errorHandler.js`**
   - Enhanced error detection dan logging
   - Special handling untuk Business ID errors
   - Better messages untuk network errors
   - Detailed logging untuk debugging

---

## ✅ Testing Checklist

### Test Error Messages:

- [x] **Validation Error:**
  - Submit form dengan field kosong
  - Harus tampil: "Nama bahan harus diisi, Harga per unit harus >= 0"
  - Console log: validation errors details

- [x] **Business ID Error:**
  - Clear localStorage business ID
  - Try save ingredient
  - Harus tampil: "Business ID tidak ditemukan. Silakan login ulang."

- [x] **Network Error:**
  - Stop backend server
  - Try save ingredient
  - Harus tampil: "Tidak dapat terhubung ke server. Pastikan server backend berjalan."

- [x] **Success Flow:**
  - Submit valid form
  - Console log: request payload, success response
  - Modal close, data appear di list

---

## 🎯 Expected Console Output

### Success Flow:
```
📝 Creating ingredient: {name: "Beras Premium", unit: "kg", cost_per_unit: 15000, ...}
📤 Request: POST /api/v1/ingredients
✅ Response: 201 /api/v1/ingredients
✅ Ingredient created: {id: 1, name: "Beras Premium", ...}
📦 Ingredients Response: [{id: 1, ...}]
```

### Validation Error Flow:
```
📝 Creating ingredient: {name: "", unit: "kg", ...}
📤 Request: POST /api/v1/ingredients
❌ Response Error: {url: "/api/v1/ingredients", status: 422, message: "Request failed..."}
🔍 Error details: {hasResponse: true, status: 422, response: {errors: {name: ["Nama bahan harus diisi"]}}}
⚠️ Validation errors: ["Nama bahan harus diisi"]
❌ Create ingredient error: {errors: {name: [...]}}
```

### Network Error Flow:
```
📝 Creating ingredient: {name: "Beras", ...}
📤 Request: POST /api/v1/ingredients
❌ Request Error: Error: Network Error
🔍 Error details: {hasResponse: false, hasRequest: true, message: "Network Error"}
❌ Network error: Tidak dapat terhubung ke server
```

---

## 🚀 Result

Setelah fix ini:
- ✅ Error messages sekarang tampil dengan jelas dan spesifik
- ✅ User mendapat petunjuk apa yang harus dilakukan
- ✅ Developer dapat debug dengan mudah via console
- ✅ Validation errors dari Laravel terformat dengan baik
- ✅ Business ID dan network errors mendapat special handling
- ✅ Comprehensive logging untuk troubleshooting

**Status: PRODUCTION READY** 🎉

---

## 📌 Common Issues & Solutions

### Issue: "Business ID tidak ditemukan"
**Cause:** localStorage business ID missing atau expired
**Solution:** Login ulang, atau set manual via:
```javascript
localStorage.setItem('currentBusinessId', '1');
```

### Issue: "Tidak dapat terhubung ke server"
**Cause:** Backend server tidak running
**Solution:**
```bash
cd backend
php artisan serve
```

### Issue: Validation errors tidak tampil
**Cause:** Error property mismatch (sudah fixed)
**Solution:** Pastikan menggunakan kode yang sudah di-update

---

**Last Updated:** 2025-10-10
**Version:** 1.0.2
