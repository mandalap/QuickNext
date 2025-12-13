# Cara Debug dengan React DevTools - Panduan Praktis

## 🎯 Langkah-langkah Debug Sekarang

### **1. Cari Komponen KasirDashboard**

Di React DevTools Components tab yang sudah terbuka:

1. **Expand component tree:**

   - Klik `App` → expand
   - Klik `QueryClientProvider` → expand
   - Klik `Context.Provider` (AuthProvider) → expand
   - Klik `Context.Provider` (ToastProvider) → expand
   - Cari `Router` atau `BrowserRouter` → expand
   - Cari `KasirDashboard` di dalam Router

2. **Jika tidak langsung terlihat:**
   - Gunakan **Search box** di bagian atas React DevTools
   - Ketik: `KasirDashboard`
   - Otomatis highlight komponennya

---

### **2. Pilih Komponen KasirDashboard**

1. **Klik `KasirDashboard`** di component tree
2. **Panel kanan akan menampilkan:**
   - **Props:** `{}` (kosong biasanya)
   - **Hooks:** Semua hooks yang digunakan
   - **State:** State lokal komponen

---

### **3. Cek Data yang Penting**

Di **Panel Kanan**, cari dan cek:

#### **A. Hooks - useState (activeShift):**

```
useState (activeShift):
  Value: {
    id: 123,
    total_transactions: 3,  ← Cek ini!
    expected_total: 205000,
    opened_at: "2025-11-01T18:22:00",
    ...
  }
```

**Yang Dicari:**

- `total_transactions: ?` → Harusnya 3
- `expected_total: ?` → Harusnya 205000

#### **B. Hooks - useShiftOrders:**

```
useShiftOrders:
  shiftOrders: Array(3)  ← Cek ini!
  usingShiftOrders: true  ← Harus true
  loading: false
```

**Yang Dicari:**

- `shiftOrders.length: ?` → Harusnya 3
- `usingShiftOrders: ?` → Harusnya `true`

#### **C. State - recentTransactions:**

```
recentTransactions: Array(?)  ← Cek ini!
  [0]: {id: 309, total: 81800, ...}
  [1]: {id: 307, total: 96400, ...}
  [2]: {id: 305, total: 26800, ...}  ← Apakah ada?
```

**Yang Dicari:**

- `recentTransactions.length: ?` → Harusnya 3
- Bandingkan dengan `activeShift.total_transactions`

---

### **4. Store as Global Variable (Untuk Inspect Detail)**

1. **Klik kanan** pada `activeShift` di panel kanan
2. **Pilih "Store as global variable"**
3. **Buka tab Console** (di DevTools)
4. **Ketik di Console:**

```javascript
// Cek total transaksi
temp1.total_transactions;

// Cek ID shift
temp1.id;

// Cek expected total
temp1.expected_total;

// Cek orders (jika ada)
temp1.orders?.length;
```

5. **Lakukan hal yang sama untuk `recentTransactions`:**

   - Klik kanan `recentTransactions` → Store as global variable
   - Di Console: `temp2.length`

6. **Compare:**
   ```javascript
   temp1.total_transactions === temp2.length;
   // true = konsisten ✅
   // false = ada masalah ❌
   ```

---

### **5. Debug Halaman Penjualan**

1. **Buka tab baru:** `/sales`
2. **Buka React DevTools** (F12)
3. **Cari `SalesManagement`** di component tree
4. **Pilih `SalesManagement`**
5. **Cek di panel kanan:**

```
useShiftOrders:
  shiftOrders: Array(?)  ← Harusnya 3
  usingShiftOrders: true  ← Harus true

activeShift:
  total_transactions: ?  ← Harusnya 3
```

6. **Bandingkan dengan Dashboard:**
   - Dashboard: `shiftOrders.length = ?`
   - Penjualan: `shiftOrders.length = ?`
   - Harusnya sama!

---

### **6. Monitor Re-renders (Untuk Debug Refresh)**

1. **Di React DevTools, klik ikon ⚙️** (Settings) di bagian atas
2. **Centang "Highlight updates when components render"**
3. **Klik tombol Refresh** di dashboard
4. **Perhatikan:**
   - Apakah `KasirDashboard` berkedip? (berarti re-render)
   - Setelah berkedip, apakah data berubah?

**Jika tidak berkedip:**

- Refresh handler tidak bekerja
- `useEffect` tidak dipanggil

**Jika berkedip tapi data sama:**

- API tidak return data baru
- State tidak ter-update

---

### **7. Inspect API Response**

1. **Buka tab "Network"** di DevTools
2. **Filter: Fetch/XHR**
3. **Klik tombol Refresh** di dashboard
4. **Cari request:** `/api/v1/shift/active` atau `/api/v1/shift/{id}/detail`
5. **Klik request tersebut**
6. **Tab "Preview" atau "Response":**
   - Cek `total_transactions: ?`
   - Cek `orders: []` → berapa jumlahnya?
7. **Bandingkan dengan state di React DevTools:**
   - Apakah sama?

---

## 🔍 Contoh Debug Real

### **Scenario: Total Transaksi Tidak Konsisten**

**Langkah:**

1. **Dashboard (`/cashier`):**

   ```
   React DevTools → KasirDashboard
   ├─ activeShift.total_transactions: 3  ✅
   ├─ shiftOrders.length: 3  ✅
   └─ recentTransactions.length: 3  ✅
   ```

2. **Halaman Penjualan (`/sales`):**
   ```
   React DevTools → SalesManagement
   ├─ activeShift.total_transactions: 3  ✅
   ├─ shiftOrders.length: 2  ❌ ← MASALAH!
   └─ usingShiftOrders: true  ✅
   ```

**Diagnosis:**

- Dashboard: konsisten (3)
- Penjualan: tidak konsisten (2 dari 3)
- **Masalah:** Filter di `loadOrdersFromShift()` menyembunyikan 1 transaksi

**Solusi:**

- Cek filter `statusFilter` atau `searchTerm`
- Cek apakah ada kondisi di render yang menyembunyikan order

---

## 💡 Tips Praktis

### **1. Gunakan Search untuk Cari Komponen Cepat:**

- Di React DevTools, ada search box di atas
- Ketik: `KasirDashboard` → langsung jump ke komponen

### **2. Inspect Element:**

- Klik ikon **inspect** (kiri atas DevTools)
- Klik elemen di halaman (misalnya tombol "Refresh")
- Otomatis highlight komponen React-nya di tree

### **3. View Source (Langsung ke Code):**

- Pilih komponen di tree
- Di panel kanan, klik **"View source"**
- Langsung ke file `KasirDashboard.jsx`
- Set breakpoint untuk debug

### **4. Profiler (Untuk Performa):**

- Tab **"Profiler ⚛"**
- Klik **Record** (lingkaran biru)
- Lakukan action (misalnya refresh)
- **Stop**
- Lihat komponen yang render lama (warna kuning/oranye)

---

## 📊 Checklist Quick Debug

### **Data Tidak Muncul:**

- [ ] `activeShift.total_transactions` = ?
- [ ] `shiftOrders.length` = ?
- [ ] `recentTransactions.length` = ?
- [ ] Semua harus sama!

### **Refresh Tidak Update:**

- [ ] Aktifkan "Highlight updates"
- [ ] Klik Refresh → apakah berkedip?
- [ ] Setelah berkedip, apakah data berubah?
- [ ] Cek Network tab → API response baru?

### **Orders Tidak Muncul:**

- [ ] `usingShiftOrders: true`?
- [ ] `shiftOrders.length` = ?
- [ ] Filter `searchTerm` kosong?
- [ ] Filter `statusFilter = 'all'`?

---

## 🎓 Kesimpulan

**Dengan React DevTools, Anda bisa:**

- ✅ Melihat state real-time
- ✅ Track data dari API sampai render
- ✅ Debug kenapa data tidak konsisten
- ✅ Memahami flow aplikasi

**Untuk aplikasi kasir ini, gunakan untuk:**

- ✅ Debug data shift yang tidak konsisten
- ✅ Debug orders yang tidak muncul
- ✅ Debug refresh yang tidak update
- ✅ Optimasi performa

**Selamat debugging! 🚀**
