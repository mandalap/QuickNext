# Perbaikan Network Error yang Membuat Halaman POS Lambat

## 🐛 Masalah

Ketika membuka halaman POS Kasir, terjadi error di console:

```
Network error: Tidak dapat terhubung ke server
```

**Dampak:**

- Halaman POS loading lama (menunggu timeout dari axios, default 15 detik)
- Banyak error spam di console
- User experience buruk karena halaman terblokir

**Penyebab:**

1. `getActiveShift()` dipanggil saat mount
2. Jika backend tidak berjalan, request timeout lama (15 detik)
3. Error handler langsung redirect atau block halaman
4. Tidak ada timeout khusus untuk shift check

---

## ✅ Solusi yang Diimplementasikan

### 1. **Timeout Khusus untuk Shift Check**

**File**: `app/frontend/src/services/shift.service.js`

```javascript
getActiveShift: async () => {
  try {
    // Timeout khusus 5 detik (lebih pendek dari default 15s)
    const response = await apiClient.get("/v1/shifts/active", {
      timeout: 5000,
    });
    return { success: true, data: response.data };
  } catch (error) {
    // Handle timeout dengan flag khusus
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        success: false,
        error: "Request timeout. Pastikan backend berjalan.",
        isTimeout: true,
      };
    }

    // Handle network error dengan flag khusus
    if (error.request && !error.response) {
      return {
        success: false,
        error: "Tidak dapat terhubung ke server",
        isNetworkError: true,
      };
    }

    return handleApiError(error);
  }
};
```

**Perubahan:**

- ✅ Timeout khusus 5 detik (bukan 15 detik)
- ✅ Flag `isTimeout` dan `isNetworkError` untuk membedakan jenis error
- ✅ Tidak spam console dengan error (hanya `console.warn`)

### 2. **Error Handling yang Lebih Baik di CashierPOS**

**File**: `app/frontend/src/components/pos/CashierPOS.jsx`

```javascript
const [hasNetworkError, setHasNetworkError] = useState(false);

const loadActiveShift = async () => {
  setLoadingShift(true);
  try {
    const result = await shiftService.getActiveShift();

    // Handle timeout/network error - jangan block halaman
    if (result.isTimeout || result.isNetworkError) {
      console.warn("⚠️ Shift check gagal (timeout/network), mode offline");
      toast.error(
        "Tidak dapat terhubung ke server. Pastikan backend berjalan.",
        {
          duration: 3000,
        }
      );
      setActiveShift(null);
      setHasNetworkError(true); // Set flag
      return; // Jangan redirect
    }

    // Reset flag jika berhasil
    setHasNetworkError(false);

    if (result.success && result.data?.has_active_shift) {
      setActiveShift(result.data.data);
    } else {
      setActiveShift(null);
      // Hanya redirect jika bukan network error
      if (result.error && !result.isNetworkError) {
        toast.error("Anda harus membuka shift terlebih dahulu");
        navigate("/cashier");
      }
    }
  } catch (error) {
    // Handle catch error juga
    if (error.message === "Request timeout" || error.code === "ECONNABORTED") {
      setHasNetworkError(true);
      setActiveShift(null);
      // Jangan redirect
    }
  } finally {
    setLoadingShift(false);
  }
};
```

**Perubahan:**

- ✅ Track network error dengan state `hasNetworkError`
- ✅ Jika network error, jangan redirect (biarkan halaman terbuka)
- ✅ Tampilkan warning banner, bukan block halaman
- ✅ Timeout handling yang lebih baik

### 3. **UI Mode Offline dengan Warning Banner**

**File**: `app/frontend/src/components/pos/CashierPOS.jsx`

```javascript
// Show error jika tidak ada shift (hanya jika bukan network error)
if (!activeShift && !loadingShift && !hasNetworkError) {
  return (
    // ... error screen "Shift Belum Dibuka"
  );
}

// Tampilkan POS meskipun network error, dengan warning banner
return (
  <>
    {/* Network Error Warning Banner */}
    {hasNetworkError && (
      <div className='mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded'>
        <div className='flex items-center'>
          <AlertCircle className='w-5 h-5 text-yellow-400 mr-2' />
          <div className='flex-1'>
            <p className='text-sm font-semibold text-yellow-800'>
              Mode Offline - Tidak Dapat Terhubung ke Server
            </p>
            <p className='text-xs text-yellow-700 mt-1'>
              Pastikan backend berjalan di http://localhost:8000.
              Beberapa fitur mungkin tidak berfungsi.
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setHasNetworkError(false);
              loadActiveShift();
            }}
          >
            <RefreshCw className='w-4 h-4 mr-2' />
            Coba Lagi
          </Button>
        </div>
      </div>
    )}

    {/* POS Interface */}
    {/* ... existing POS code ... */}
  </>
);
```

**Perubahan:**

- ✅ Halaman tetap bisa dibuka meskipun network error
- ✅ Warning banner yang jelas (bukan blocking screen)
- ✅ Button "Coba Lagi" untuk retry shift check
- ✅ User bisa tetap lihat produk meskipun offline

---

## 📊 Perbandingan Sebelum vs Sesudah

### ❌ **Sebelum:**

- Timeout: 15 detik (terlalu lama)
- Network error: Block halaman, redirect ke dashboard
- Console: Banyak error spam
- User experience: Buruk (halaman loading lama)

### ✅ **Sesudah:**

- Timeout: 5 detik (lebih cepat)
- Network error: Warning banner, halaman tetap terbuka
- Console: Hanya warning (tidak spam)
- User experience: Baik (halaman cepat load dengan warning)

---

## 🎯 Hasil

### Performa:

- **Sebelum**: Loading 15 detik (timeout) + redirect
- **Sesudah**: Loading 5 detik (timeout) + warning banner
- **Improvement**: ~67% lebih cepat (dari 15s ke 5s)

### User Experience:

- **Sebelum**: Halaman terblokir, user bingung
- **Sesudah**: Halaman terbuka dengan warning, user bisa retry

### Console:

- **Sebelum**: Banyak error spam
- **Sesudah**: Hanya warning yang informatif

---

## 🧪 Testing

### Test Case 1: Backend Tidak Berjalan

1. Stop backend server
2. Buka halaman POS Kasir
3. ✅ Halaman load cepat (5 detik max)
4. ✅ Warning banner muncul
5. ✅ POS interface tetap tampil
6. ✅ Console hanya warning (tidak spam error)

### Test Case 2: Backend Berjalan

1. Start backend server
2. Buka halaman POS Kasir
3. ✅ Halaman load cepat
4. ✅ Shift check berhasil
5. ✅ Tidak ada warning banner
6. ✅ POS berfungsi normal

### Test Case 3: Backend Lambat

1. Backend berjalan tapi lambat (>5 detik)
2. Buka halaman POS Kasir
3. ✅ Timeout setelah 5 detik
4. ✅ Warning banner muncul
5. ✅ User bisa klik "Coba Lagi"

---

## 📝 Catatan

### File yang Dimodifikasi:

1. ✅ `app/frontend/src/services/shift.service.js`

   - Tambah timeout 5 detik
   - Tambah flag `isTimeout` dan `isNetworkError`

2. ✅ `app/frontend/src/components/pos/CashierPOS.jsx`
   - Tambah state `hasNetworkError`
   - Perbaiki error handling di `loadActiveShift`
   - Tambah warning banner UI
   - Update conditional rendering untuk network error

### Tidak Perlu Modifikasi:

- ✅ `app/frontend/src/utils/apiClient.js` - timeout global tetap 15s (OK)
- ✅ `app/frontend/src/utils/errorHandler.js` - tetap digunakan untuk error lainnya

---

## 🚀 Kesimpulan

**Masalah utama**: Network error saat shift check membuat halaman POS loading lama dan terblokir.

**Solusi**:

1. ✅ Timeout khusus 5 detik untuk shift check
2. ✅ Flag network error untuk tracking
3. ✅ Warning banner instead of blocking screen
4. ✅ Halaman tetap bisa dibuka meskipun network error

**Hasil**: Halaman POS sekarang load lebih cepat dan user-friendly meskipun backend tidak berjalan.

---

**Versi**: 1.0  
**Tanggal**: 2025-01-15  
**Status**: ✅ **IMPLEMENTED & TESTED**











































