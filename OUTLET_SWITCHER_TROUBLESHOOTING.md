# Troubleshooting: Outlet Switcher Tidak Muncul di Navbar

## Masalah

Outlet switcher tidak muncul di navbar halaman self service dan halaman lainnya.

## Penyebab Umum

### 1. **Business ID Tidak Diset**

- User belum memilih business
- `currentBusinessId` tidak ada di localStorage

### 2. **Outlet Tidak Dimuat**

- API call ke `/outlets` gagal
- Header `X-Business-Id` tidak dikirim
- Token authentication bermasalah

### 3. **Role User Bermasalah**

- User dengan role `kasir` tidak di-assign ke outlet
- User tidak memiliki akses ke outlet

## Solusi

### 1. **Pastikan Business Sudah Dipilih**

```javascript
// Cek di console browser
console.log("Business ID:", localStorage.getItem("currentBusinessId"));
console.log("User:", JSON.parse(localStorage.getItem("user")));
```

### 2. **Debug Outlet Loading**

1. Buka halaman Self Service
2. Klik tombol **"Debug Outlets"** (sementara)
3. Lihat console untuk pesan debug
4. Periksa apakah outlet berhasil dimuat

### 3. **Cek API Endpoint**

```bash
# Test API endpoint
curl -H "X-Business-Id: 1" -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/outlets
```

### 4. **Assign User ke Outlet (untuk role kasir)**

1. Login sebagai admin/owner
2. Buka **Employee Outlet Management**
3. Pilih user kasir
4. Assign ke outlet yang diinginkan
5. Set sebagai primary outlet

### 5. **Force Reload Outlets**

```javascript
// Di console browser
localStorage.removeItem("outlets");
localStorage.removeItem("currentOutletId");
window.location.reload();
```

## Debug Steps

### 1. **Cek Console Browser**

Buka Developer Tools (F12) dan lihat pesan:

```
🔍 OutletSwitcher render: {...}
⚠️ OutletSwitcher: No outlets available
🔍 loadOutlets: Loading all outlets for role: owner
```

### 2. **Cek Network Tab**

Lihat request ke `/api/outlets`:

- Status: 200 OK
- Headers: `X-Business-Id` dan `Authorization`
- Response: Array outlet

### 3. **Cek Local Storage**

```javascript
console.log("Business ID:", localStorage.getItem("currentBusinessId"));
console.log("Outlet ID:", localStorage.getItem("currentOutletId"));
console.log("User:", localStorage.getItem("user"));
```

## Status Komponen

### OutletSwitcher

- **Tidak Render**: `outlets` null atau empty array
- **Render**: `outlets` ada dan length > 0

### AuthContext

- **Loading**: `outlets` null
- **Loaded**: `outlets` array dengan data
- **Error**: `outlets` empty array

## Verifikasi Database

### 1. **Cek Outlet di Database**

```sql
SELECT * FROM outlets WHERE business_id = 1;
```

### 2. **Cek Business**

```sql
SELECT * FROM businesses WHERE id = 1;
```

### 3. **Cek Employee Outlet Assignment**

```sql
SELECT * FROM employee_outlets WHERE employee_id = USER_ID;
```

## Temporary Fix

Jika outlet switcher masih tidak muncul:

1. **Manual Set Business ID**:

   ```javascript
   localStorage.setItem("currentBusinessId", "1");
   window.location.reload();
   ```

2. **Force Load Outlets**:
   ```javascript
   // Di console browser
   fetch("/api/outlets", {
     headers: {
       Authorization: `Bearer ${localStorage.getItem("token")}`,
       "X-Business-Id": localStorage.getItem("currentBusinessId"),
       "Content-Type": "application/json",
     },
   })
     .then((r) => r.json())
     .then(console.log);
   ```

## Next Steps

Setelah outlet switcher muncul:

1. Pilih outlet yang diinginkan
2. Outlet akan tersimpan di localStorage
3. Halaman akan reload untuk update context
4. Modal "Buat Meja" akan menampilkan outlet yang dipilih




















































































