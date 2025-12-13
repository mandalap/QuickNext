# 🔧 Clear Outlet Cache - Fix Stale Outlet Data

## ❌ Masalah

Outlet lama "Haya Store" masih muncul di header, padahal sudah dihapus. Di daftar outlet sudah ada yang baru "KasirKu - Main Outlet".

## 🔍 Penyebab

1. **Cache Outlet Lama** - Outlet lama masih tersimpan di `localStorage` (`currentOutlet`)
2. **Tidak Ada Validasi** - Saat load outlets, tidak ada validasi apakah cached outlet masih ada di list outlets baru
3. **Business ID Mismatch** - Cached outlet mungkin dari business yang berbeda

---

## ✅ Solusi yang Diterapkan

### 1. Validasi Cached Outlet

Sebelum menggunakan cached outlet, validasi:
- Apakah outlet masih ada di list outlets yang baru di-load?
- Apakah outlet business_id match dengan current business?

### 2. Clear Stale Cache

Jika cached outlet tidak ditemukan atau business_id tidak match:
- Clear `currentOutlet` dari localStorage
- Clear `currentOutletId` dari localStorage
- Gunakan outlet pertama yang tersedia

### 3. Validasi Saat Load

Saat load outlets:
1. Clear cached outlet jika tidak ada di list baru
2. Validate saved outlet ID masih ada
3. Jika tidak ada, clear dan gunakan outlet pertama

---

## 🧪 Testing

### Test Case 1: Outlet Lama Sudah Dihapus
1. Hapus outlet lama
2. Reload halaman
3. **Expected:** Outlet baru muncul di header (bukan outlet lama)

### Test Case 2: Switch Business
1. Switch ke business lain
2. **Expected:** Outlet yang muncul sesuai dengan business yang dipilih

### Test Case 3: Clear Cache Manual
Jika masih bermasalah, clear cache manual:
```javascript
// Di browser console (F12)
localStorage.removeItem('currentOutlet');
localStorage.removeItem('currentOutletId');
localStorage.removeItem('outlets');
location.reload();
```

---

## 📝 Perubahan yang Dilakukan

### File: `app/frontend/src/contexts/AuthContext.jsx`

1. **Validasi Cached Outlet** (line ~109-135)
   - Check business_id match sebelum menggunakan cached outlet
   - Clear cache jika business_id tidak match

2. **Validasi Saat Load Outlets - Kasir** (line ~755-795)
   - Clear cached outlet jika tidak ada di assigned outlets
   - Validate saved outlet ID masih ada

3. **Validasi Saat Load Outlets - Owner/Admin** (line ~857-891)
   - Clear cached outlet jika tidak ada di outlets list
   - Validate saved outlet ID masih ada

---

## 🐛 Troubleshooting

### Masih Muncul Outlet Lama?

1. **Clear Cache Manual:**
   ```javascript
   // Di browser console (F12)
   localStorage.removeItem('currentOutlet');
   localStorage.removeItem('currentOutletId');
   localStorage.removeItem('outlets');
   location.reload();
   ```

2. **Cek Console:**
   - Cari log: `⚠️ Cached outlet not found`
   - Cari log: `🔍 loadOutlets: Saved outlet ID:`
   - Cari log: `⚠️ loadOutlets: Saved outlet ID not found`

3. **Cek Network:**
   - Buka Network tab (F12)
   - Cari request ke `/api/v1/outlets`
   - Cek response - apakah outlet lama masih ada?

---

## ✅ Quick Fix Checklist

- [x] Validasi cached outlet saat load
- [x] Clear stale cache jika outlet tidak ditemukan
- [x] Validate business_id match
- [x] Clear cache jika business_id tidak match
- [ ] Test dengan outlet yang sudah dihapus
- [ ] Test dengan switch business

---

**Setelah fix, reload halaman dan outlet baru seharusnya muncul!** 🚀

