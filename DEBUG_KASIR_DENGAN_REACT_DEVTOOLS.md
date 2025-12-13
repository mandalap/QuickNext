# Debug Aplikasi Kasir dengan React DevTools

## 🎯 Quick Start

### **1. Setup**

1. ✅ React DevTools sudah ter-install
2. Buka aplikasi di browser
3. Tekan **F12** untuk buka DevTools
4. Cari tab **"Components ⚛"**

---

## 🔍 Debug Skenario Real

### **Skenario 1: Debug "Total Transaksi Tidak Konsisten"**

#### **Masalah:**

- Dashboard: 3 transaksi
- Halaman Penjualan: 2 transaksi
- Modal Tutup Shift: 3 transaksi

#### **Langkah Debug:**

**A. Cek Dashboard:**

1. Buka `/cashier`
2. React DevTools → Components → `KasirDashboard`
3. **Panel Kanan → Hooks:**

   ```
   useShiftOrders:
     shiftOrders: Array(3)  ✅
     usingShiftOrders: true ✅

   useState (activeShift):
     total_transactions: 3  ✅
   ```

4. **Panel Kanan → State:**
   ```
   recentTransactions: Array(3)  ✅
   ```

**B. Cek Halaman Penjualan:**

1. Buka `/sales`
2. React DevTools → Components → `SalesManagement`
3. **Panel Kanan → Hooks:**

   ```
   useShiftOrders:
     shiftOrders: Array(2)  ❌ ← MASALAH!
     usingShiftOrders: true ✅

   useState (activeShift):
     total_transactions: 3  ✅
   ```

**Diagnosis:**

- `activeShift` sama (3 transaksi) ✅
- Dashboard: `shiftOrders.length = 3` ✅
- Penjualan: `shiftOrders.length = 2` ❌
- **Masalah:** Filter di `SalesManagement` menyembunyikan 1 transaksi

**Solusi:**

- Cek filter `statusFilter` atau `searchTerm`
- Cek apakah ada filter di `loadOrdersFromShift()`

---

### **Skenario 2: Debug "Refresh Tidak Update Data"**

#### **Masalah:**

- Klik tombol Refresh
- Data tidak ter-update

#### **Langkah Debug:**

1. **Buka Dashboard** (`/cashier`)
2. **React DevTools → Components → `KasirDashboard`**
3. **Aktifkan "Highlight updates"** (ikon ⚙️ → centang)
4. **Klik tombol Refresh**
5. **Perhatikan:**
   - Apakah `KasirDashboard` berkedip?
   - Apakah state berubah?

**Jika tidak berkedip:**

```
❌ Komponen tidak re-render
→ useEffect tidak dipanggil
→ Refresh handler tidak bekerja
```

**Jika berkedip tapi data sama:**

```
✅ Komponen re-render
❌ Data tidak ter-update
→ API return data lama
→ State tidak ter-set dari API response
```

**Debug Detail:**

1. **Cek Refresh Handler:**

   - Panel Kanan → **"View source"**
   - Cari function `handleRefresh`
   - Set breakpoint di dalam function
   - Klik Refresh lagi
   - Step through code

2. **Cek API Call:**
   - DevTools → **Network tab**
   - Filter: **Fetch/XHR**
   - Klik Refresh
   - Cek response API `/api/v1/shift/active`
   - Bandingkan dengan state di React DevTools

---

### **Skenario 3: Debug "Orders Tidak Muncul di Tab Pesanan"**

#### **Masalah:**

- Total Pesanan: 3
- Selesai: 3
- Tapi di tab Pesanan hanya 2 yang muncul

#### **Langkah Debug:**

1. **Buka Halaman Penjualan** (`/sales`)
2. **Buka Tab "Pesanan"**
3. **React DevTools → Components → `SalesManagement`**
4. **Panel Kanan → State:**

**a. Cek orders source:**

```javascript
usingShiftOrders: true  ✅ Menggunakan shift orders

shiftOrders: [
  {id: 309, status: 'completed', payment_status: 'paid', ...},
  {id: 307, status: 'completed', payment_status: 'paid', ...},
  {id: 305, status: 'completed', payment_status: 'paid', ...}
]  ✅ Semua 3 ada

// Tapi di render:
(usingShiftOrders ? shiftOrders : orders).length
→ 2  ❌ Hanya 2 yang di-render
```

**b. Cek filter:**

```javascript
searchTerm: ""  ✅ Tidak ada search
statusFilter: "all"  ✅ Filter semua status
```

**Diagnosis:**

- Data ada 3 ✅
- Tidak ada filter aktif ✅
- Tapi hanya 2 yang di-render ❌
- **Masalah:** Ada filter tersembunyi atau kondisi render yang salah

**Solusi:**

1. **Klik kanan pada `shiftOrders` → "Store as global variable"**
2. **Di Console:**
   ```javascript
   temp1.length; // 3
   temp1.filter((o) => o.payment_status === "paid").length; // 3
   temp1.filter((o) => o.status === "completed").length; // 3
   ```
3. **Cek apakah ada filter di render:**
   - View source → cari `.map()` atau `.filter()`
   - Cek kondisi yang mungkin menyembunyikan order

---

## 🛠️ Tools Praktis di React DevTools

### **1. Inspect Element → Komponen**

```
Klik ikon inspect (kiri atas DevTools)
→ Klik elemen di halaman
→ Otomatis highlight komponen React-nya
```

**Contoh:**

- Klik tombol "Refresh" di dashboard
- Otomatis highlight komponen yang punya tombol tersebut

### **2. Store as Global Variable**

```
Klik kanan state/props
→ "Store as global variable"
→ Di Console: temp1, temp2, dst
```

**Contoh Praktis:**

```javascript
// Di React DevTools, store activeShift
temp1; // {id: 123, total_transactions: 3, ...}

// Di Console
temp1.total_transactions; // 3
temp1.expected_total; // 205000

// Compare dengan API
// (Network tab → /api/v1/shift/active → Preview)
```

### **3. View Source**

```
Klik komponen di tree
→ Panel kanan → "View source"
→ Langsung ke file source code
```

**Contoh:**

- Pilih `KasirDashboard`
- View source → langsung ke `KasirDashboard.jsx`
- Set breakpoint → debug langsung di source

### **4. Profiler untuk Performa**

```
Tab "Profiler ⚛"
→ Klik Record (lingkaran biru)
→ Lakukan action
→ Stop
→ Analisis render time
```

**Yang Dicari:**

- Komponen kuning/oranye = lama render
- Re-render terlalu sering = perlu optimasi

---

## 📊 Contoh Output Debug

### **Debug Dashboard Kasir:**

```
Komponen: KasirDashboard
├─ Props: {}
├─ State:
│  ├─ activeShift: {
│  │  ├─ id: 123
│  │  ├─ total_transactions: 3  ✅
│  │  ├─ expected_total: 205000
│  │  └─ opened_at: "2025-11-01T18:22:00"
│  │
│  ├─ recentTransactions: [
│  │  ├─ {id: 309, total: 81800, ...}
│  │  ├─ {id: 307, total: 96400, ...}
│  │  └─ {id: 305, total: 26800, ...}
│  │  ]  ✅ 3 items
│  │
│  └─ todayStats: {
│     ├─ totalTransactions: 3  ✅
│     ├─ totalSales: 205000
│     └─ totalItems: 8
│  }
│
└─ Hooks:
   ├─ useShiftOrders:
   │  ├─ shiftOrders: Array(3)  ✅
   │  ├─ usingShiftOrders: true  ✅
   │  └─ loading: false
   │
   └─ useEffect (dependencies: [activeShift, loadingShift])
      └─ Status: ✅ Active (akan re-run jika activeShift berubah)
```

---

### **Debug Halaman Penjualan:**

```
Komponen: SalesManagement
├─ Props: {}
├─ State:
│  ├─ activeShift: {
│  │  └─ total_transactions: 3  ✅
│  │
│  ├─ shiftOrders: [
│  │  ├─ {id: 309, ...}
│  │  ├─ {id: 307, ...}
│  │  └─ {id: 305, ...}
│  │  ]  ✅ 3 items
│  │
│  └─ usingShiftOrders: true  ✅
│
├─ Hooks:
│  ├─ useShiftOrders:
│  │  ├─ shiftOrders: Array(3)  ✅
│  │  └─ usingShiftOrders: true  ✅
│  │
│  └─ useSales:
│     ├─ orders: Array(2)  ❌ ← MASALAH!
│     └─ loading: false
│
└─ Render:
   ├─ usingShiftOrders ? shiftOrders : orders
   ├─ shiftOrders.length = 3  ✅
   └─ Tapi di render hanya 2  ❌
```

**Diagnosis:**

- Data shift ada 3 ✅
- `shiftOrders` ada 3 ✅
- Tapi render hanya 2 ❌
- **Kemungkinan:** Ada filter di render atau kondisi yang salah

---

## 🔧 Checklist Debug

### **Jika Data Tidak Muncul:**

- [ ] Cek `activeShift` ada dan valid?
- [ ] Cek `shiftOrders.length` sesuai?
- [ ] Cek `usingShiftOrders: true`?
- [ ] Cek filter `searchTerm` kosong?
- [ ] Cek filter `statusFilter` = 'all'?
- [ ] Cek apakah orders di-filter dengan benar?
- [ ] Cek Network tab → API response sesuai?

### **Jika Refresh Tidak Update:**

- [ ] Cek `useEffect` dependencies berubah?
- [ ] Cek refresh handler dipanggil?
- [ ] Cek API call berhasil (Network tab)?
- [ ] Cek state setter dipanggil?
- [ ] Cek apakah ada error di console?

### **Jika Performa Lambat:**

- [ ] Gunakan Profiler untuk cek render time
- [ ] Cek komponen yang re-render terlalu sering
- [ ] Cek API call yang lama (>1 detik)
- [ ] Cek apakah ada infinite loop?

---

## 💡 Tips Praktis

### **1. Gunakan Console untuk Quick Check:**

Setelah **Store as global variable**:

```javascript
// Cek data shift
temp1.activeShift?.total_transactions;

// Cek orders
temp1.shiftOrders?.length;
temp1.recentTransactions?.length;

// Compare
temp1.activeShift.total_transactions === temp1.shiftOrders.length;
// true = konsisten ✅
// false = ada masalah ❌
```

### **2. Monitor Re-renders:**

Aktifkan **"Highlight updates"**:

- Komponen yang re-render akan berkedip
- Jika terlalu sering → perlu optimasi

### **3. Trace Data Flow:**

1. **Network tab** → cek API response
2. **React DevTools** → cek state setelah API
3. **Compare** → apakah data sama?

---

## 🎓 Kesimpulan

**Dengan React DevTools, Anda bisa:**

- ✅ Melihat state real-time
- ✅ Track perubahan data
- ✅ Debug performa issues
- ✅ Memahami struktur komponen
- ✅ Menemukan masalah dengan cepat

**Untuk aplikasi kasir, React DevTools sangat membantu untuk:**

- ✅ Debug data shift yang tidak konsisten
- ✅ Debug orders yang tidak muncul
- ✅ Debug refresh yang tidak update
- ✅ Optimasi performa dashboard

**Selamat debugging! 🚀**
