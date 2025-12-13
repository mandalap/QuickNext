# Panduan Debug dengan React DevTools untuk Aplikasi Kasir

## 🎯 Tujuan

Menggunakan React DevTools untuk menemukan dan memperbaiki masalah di aplikasi kasir, terutama terkait:

- Data shift yang tidak konsisten
- Orders yang tidak muncul
- State yang tidak ter-update
- Performa yang lambat

---

## 📋 Langkah-langkah Dasar

### 1. Membuka React DevTools

1. **Install Extension** (sudah selesai ✅)
2. **Buka Browser DevTools** (F12 atau Right Click → Inspect)
3. **Cari Tab "Components ⚛"** di DevTools
4. Jika tidak muncul, **refresh halaman** (Ctrl+R atau F5)

---

## 🔍 Cara Debug dengan React DevTools

### **A. Debug Data Shift yang Tidak Konsisten**

#### **Masalah:** Total transaksi berbeda antara dashboard dan halaman penjualan

#### **Langkah Debug:**

1. **Buka Halaman Kasir Dashboard** (`/cashier`)
2. **Buka React DevTools → Tab "Components ⚛"**
3. **Cari komponen `KasirDashboard`** di tree
4. **Pilih komponen `KasirDashboard`**

#### **Cek di Panel Kanan:**

**a. Props:**

```
- activeShift: {...}
  - total_transactions: 3
  - expected_total: 205000
  - opened_at: "2025-11-01T18:22:00"
```

**b. Hooks:**

```
- useState (activeShift):
  - Value: {...}
    - total_transactions: 3
    - id: 123

- useShiftOrders:
  - shiftOrders: [...]
  - usingShiftOrders: true
  - shiftOrders.length: 3
```

**c. State:**

```
- recentTransactions: [...]
  - Array length: 3
  - [0]: {id: 309, total: 81800, ...}
  - [1]: {id: 307, total: 96400, ...}
  - [2]: {id: 305, total: 26800, ...}
```

#### **Cara Menemukan Masalah:**

1. **Cek apakah `activeShift.total_transactions` = 3**
2. **Cek apakah `recentTransactions.length` = 3**
3. **Jika berbeda → Ada masalah di `loadTransactionData()`**

**Contoh:**

```
✅ activeShift.total_transactions: 3
❌ recentTransactions.length: 2  // ← MASALAH!
```

→ **Masalah:** Ada 1 transaksi yang tidak ter-load ke `recentTransactions`

---

### **B. Debug Orders di Halaman Penjualan**

#### **Masalah:** Hanya 2 orders muncul padahal seharusnya 3

#### **Langkah Debug:**

1. **Buka Halaman Penjualan** (`/sales`)
2. **Buka React DevTools → Tab "Components ⚛"**
3. **Cari komponen `SalesManagement`**
4. **Pilih komponen `SalesManagement`**

#### **Cek di Panel Kanan:**

**a. Hooks:**

```
- useShiftOrders:
  - shiftOrders: [...]
    - length: 3
  - usingShiftOrders: true

- useSales:
  - orders: [...]
    - length: 2  // ← MASALAH!
```

**b. State:**

```
- activeShift:
  - total_transactions: 3

- shiftOrders:
  - [0]: {id: 309, ...}
  - [1]: {id: 307, ...}
  - [2]: {id: 305, ...}
```

#### **Cara Menemukan Masalah:**

1. **Cek `usingShiftOrders`:**

   - `true` → Menggunakan orders dari shift ✅
   - `false` → Masih menggunakan API biasa ❌

2. **Cek `shiftOrders.length`:**

   - `3` → Data shift ter-load ✅
   - `2` atau `0` → Ada masalah di `loadOrdersFromShift()` ❌

3. **Cek Filter:**
   - Apakah ada filter `searchTerm` atau `statusFilter` yang menyembunyikan orders?

**Contoh Debug:**

```
✅ usingShiftOrders: true
✅ shiftOrders.length: 3
✅ activeShift.total_transactions: 3
❌ Orders di render: 2  // ← MASALAH di rendering!
```

→ **Masalah:** Ada filter atau kondisi render yang menghilangkan 1 order

---

### **C. Debug State yang Tidak Ter-update**

#### **Masalah:** Setelah refresh, data tidak ter-update

#### **Langkah Debug:**

1. **Pilih komponen yang bermasalah** (misalnya `KasirDashboard`)
2. **Di panel kanan, cek hooks `useEffect`:**

   ```
   - useEffect (dependencies: [activeShift, loadingShift])
     - Dependencies: [activeShift, loadingShift]
   ```

3. **Cek apakah dependencies ter-update:**

   - Klik kanan pada `activeShift` → **"Store as global variable"**
   - Di Console, ketik: `temp1.total_transactions`
   - Refresh halaman
   - Cek lagi: apakah nilainya sama?

4. **Cek re-render:**
   - Aktifkan **"Highlight updates"** di React DevTools
   - Refresh halaman atau trigger action
   - Lihat komponen mana yang re-render

**Cara Menggunakan "Highlight updates":**

1. Di tab "Components ⚛", klik ikon **⚙️ (Settings)**
2. Centang **"Highlight updates when components render"**
3. Setiap komponen yang re-render akan berkedip

---

### **D. Debug Custom Hooks**

#### **Masalah:** Hook `useShiftOrders` tidak return data dengan benar

#### **Langkah Debug:**

1. **Cari komponen yang menggunakan `useShiftOrders`**
2. **Cek hooks di panel kanan:**

   ```
   - useShiftOrders:
     - shiftOrders: []
     - usingShiftOrders: false
     - loading: true
     - error: null
   ```

3. **Jika `loading: true` terus:**

   - Cek apakah `loadOrdersFromShift()` dipanggil
   - Cek apakah ada error yang tidak tertangani

4. **Jika `error` ada:**
   - Klik pada error untuk melihat detail
   - Cek apakah API call gagal

**Contoh Debug Hook:**

```
✅ activeShift: {id: 123, total_transactions: 3}
❌ shiftOrders: []  // ← Masalah!
❌ usingShiftOrders: false
✅ loading: false
❌ error: "Timeout error"  // ← MASALAH DITEMUKAN!
```

→ **Solusi:** Perlu handle timeout di `useShiftOrders` atau extend timeout

---

### **E. Debug Performa (Profiler)**

#### **Masalah:** Halaman terasa lambat atau freeze

#### **Langkah Debug:**

1. **Buka tab "Profiler ⚛"** di React DevTools
2. **Klik tombol "Record" (lingkaran biru)** di kiri atas
3. **Lakukan aksi yang lambat** (misalnya refresh dashboard)
4. **Klik "Stop"** setelah selesai

#### **Analisis Hasil:**

1. **Lihat Flamegraph:**

   - Komponen yang **kuning/oranye** = lama render
   - Komponen yang **hijau** = cepat render

2. **Cek Render Time:**

   - Klik komponen yang kuning
   - Lihat **"Render duration"**
   - Jika > 100ms → Perlu optimasi

3. **Cek Re-renders:**
   - Komponen yang re-render banyak kali → Perlu `React.memo()` atau `useMemo()`

**Contoh Analisis:**

```
❌ KasirDashboard: 250ms render
  - loadTransactionData(): 200ms
  - useEffect hooks: 50ms

✅ SalesManagement: 50ms render
```

→ **Solusi:** Optimasi `loadTransactionData()` atau gunakan lazy loading

---

## 🛠️ Fitur-Fitur Penting React DevTools

### **1. Inspect Element → Component**

- Klik **ikon inspect** di kiri atas DevTools
- Klik elemen di halaman
- Otomatis highlight komponen React-nya di tree

### **2. Store as Global Variable**

- Klik kanan pada state/props
- Pilih **"Store as global variable"**
- Di Console, gunakan `temp1`, `temp2`, dst
- Berguna untuk inspect data complex

**Contoh:**

```javascript
// Di Console
temp1.activeShift.total_transactions; // 3
temp1.recentTransactions.length; // 2
```

### **3. Suspend Component**

- Pilih komponen di tree
- Klik **"Suspend"** di panel kanan
- Komponen tidak akan render (berguna untuk testing)

### **4. View Source**

- Klik komponen di tree
- Di panel kanan, klik **"View source"**
- Langsung ke file source code

---

## 🎯 Contoh Praktis: Debug Kasus Real

### **Kasus 1: Transaksi Tidak Muncul di Dashboard**

**Langkah Debug:**

1. **Buka Dashboard Kasir** (`/cashier`)
2. **Buka React DevTools → Components**
3. **Pilih `KasirDashboard`**
4. **Cek di panel kanan:**

```javascript
// State
activeShift: {
  id: 123,
  total_transactions: 3,  // ✅ Ada 3
  expected_total: 205000
}

recentTransactions: [
  {id: 309, total: 81800},
  {id: 307, total: 96400}
  // ❌ Hanya 2, seharusnya 3!
]

// Hooks
useShiftOrders: {
  shiftOrders: [
    {id: 309, ...},
    {id: 307, ...},
    {id: 305, ...}  // ✅ Semua 3 ada di sini
  ],
  usingShiftOrders: true
}
```

**Diagnosis:**

- Data shift ada 3 transaksi ✅
- `shiftOrders` ada 3 ✅
- `recentTransactions` hanya 2 ❌
- **Masalah:** Ada filter atau transform di `loadTransactionData()` yang menghilangkan 1 transaksi

**Solusi:**

- Cek filter `payment_status = 'paid'` di `loadTransactionData()`
- Cek apakah transaksi ke-3 punya `payment_status` yang berbeda

---

### **Kasus 2: Halaman Penjualan Menampilkan Data Lama**

**Langkah Debug:**

1. **Buka Halaman Penjualan** (`/sales`)
2. **Buka React DevTools → Components**
3. **Pilih `SalesManagement`**
4. **Cek di panel kanan:**

```javascript
// Props & State
activeShift: {
  total_transactions: 3  // ✅ Terbaru
}

orders: [
  {id: 309, ...},
  {id: 307, ...}
  // ❌ Hanya 2, padahal shift punya 3!
]

usingShiftOrders: false  // ❌ Tidak menggunakan shift orders!
```

**Diagnosis:**

- `activeShift` ter-update ✅
- `usingShiftOrders: false` → Masih pakai API biasa ❌
- **Masalah:** `loadOrdersFromShift()` tidak dipanggil atau gagal

**Solusi:**

- Cek apakah `dateRange === 'today'` (required untuk shift orders)
- Cek apakah `loadOrdersFromShift()` dipanggil di `useEffect`
- Cek apakah ada error di console

---

### **Kasus 3: Refresh Tidak Mengupdate Data**

**Langkah Debug:**

1. **Pilih komponen** (misalnya `KasirDashboard`)
2. **Aktifkan "Highlight updates"** di React DevTools
3. **Klik tombol Refresh** di dashboard
4. **Perhatikan:**
   - Apakah komponen berkedip (re-render)?
   - Apakah state berubah setelah kedipan?

**Jika tidak berkedip:**

- `useEffect` tidak dipanggil
- Dependencies tidak berubah
- Ada masalah di refresh handler

**Jika berkedip tapi data sama:**

- API tidak return data baru
- State tidak ter-update dari API response
- Ada cache yang tidak ter-clear

---

## 🔧 Tips & Tricks

### **1. Gunakan Console untuk Inspect Data**

Setelah **"Store as global variable"**, gunakan di Console:

```javascript
// Inspect shift data
temp1.activeShift;
temp1.activeShift.total_transactions;

// Inspect orders
temp1.recentTransactions;
temp1.recentTransactions.map((o) => ({ id: o.id, total: o.total }));

// Compare dengan API response
// (buka Network tab, cari API call, inspect response)
```

### **2. Gunakan Breakpoints di Source Code**

1. Di React DevTools, klik **"View source"**
2. Set breakpoint di baris yang ingin di-debug
3. Trigger action (misalnya refresh)
4. Step through code untuk melihat flow

### **3. Monitor Re-renders**

1. Aktifkan **"Highlight updates"**
2. Perhatikan komponen mana yang re-render terlalu sering
3. Gunakan `React.memo()` atau `useMemo()` untuk optimasi

**Contoh:**

```
❌ KasirDashboard re-render 5x saat refresh
✅ Seharusnya hanya 1x
```

---

## 📝 Checklist Debug untuk Aplikasi Kasir

### **Data Tidak Konsisten:**

- [ ] Cek `activeShift.total_transactions` di dashboard
- [ ] Cek `shiftOrders.length` di halaman penjualan
- [ ] Bandingkan dengan API response di Network tab
- [ ] Cek apakah `usingShiftOrders: true` atau `false`

### **Orders Tidak Muncul:**

- [ ] Cek `shiftOrders` di `useShiftOrders` hook
- [ ] Cek filter `searchTerm` dan `statusFilter`
- [ ] Cek apakah orders di-filter dengan benar
- [ ] Cek apakah `loadOrdersFromShift()` dipanggil

### **State Tidak Ter-update:**

- [ ] Cek `useEffect` dependencies
- [ ] Cek apakah API call berhasil
- [ ] Cek apakah state setter dipanggil
- [ ] Cek apakah ada error yang tidak tertangani

### **Performa Lambat:**

- [ ] Gunakan Profiler untuk cek render time
- [ ] Cek komponen yang re-render terlalu sering
- [ ] Cek API call yang lama
- [ ] Cek apakah ada infinite loop di `useEffect`

---

## 🎓 Kesimpulan

React DevTools adalah tool yang sangat powerful untuk:

1. ✅ Menemukan masalah data yang tidak konsisten
2. ✅ Debug state management
3. ✅ Optimasi performa
4. ✅ Memahami flow aplikasi

**Dengan React DevTools, Anda bisa:**

- Melihat state real-time
- Track perubahan data
- Debug performa issues
- Memahami struktur komponen

**Untuk aplikasi kasir ini, React DevTools sangat membantu untuk:**

- Debug data shift yang tidak konsisten
- Debug orders yang tidak muncul
- Debug state yang tidak ter-update
- Optimasi performa dashboard

---

## 📚 Referensi

- [React DevTools Documentation](https://react.dev/learn/react-developer-tools)
- [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Profiling Components](https://react.dev/learn/react-developer-tools#profiling-components-with-the-devtools-profiler)
