# 📱 PWA Back Navigation Guide

## ✅ Fitur yang Sudah Ditambahkan

### 1. **BackButton Component** ✅
Komponen tombol kembali yang dapat digunakan di seluruh aplikasi.

**Lokasi:** `app/frontend/src/components/ui/BackButton.jsx`

**Fitur:**
- ✅ Navigasi kembali menggunakan React Router
- ✅ Fallback ke path tertentu jika tidak ada history
- ✅ Styling yang dapat dikustomisasi
- ✅ Mendukung custom onClick handler
- ✅ Otomatis terintegrasi di Layout header (muncul saat tidak di dashboard)

### 2. **useBackNavigation Hook** ✅
Hook untuk navigasi kembali yang mudah digunakan.

**Lokasi:** `app/frontend/src/hooks/useBackNavigation.js`

**Fitur:**
- ✅ Mudah digunakan di komponen manapun
- ✅ Fallback path yang dapat dikustomisasi
- ✅ Menggunakan React Router untuk navigasi

### 3. **Auto Back Button di Layout** ✅
Tombol kembali otomatis muncul di header Layout ketika:
- ✅ Tidak berada di halaman dashboard (/)
- ✅ Ada history untuk kembali
- ✅ Tersembunyi di mobile, muncul di desktop (sm breakpoint ke atas)

---

## 🚀 Cara Penggunaan

### **Opsi 1: Menggunakan BackButton Component**

```jsx
import BackButton from '../components/ui/BackButton';

function MyPage() {
  return (
    <div>
      <BackButton />
      {/* Konten halaman */}
    </div>
  );
}
```

**Dengan Custom Styling:**
```jsx
<BackButton
  variant="outline"
  size="lg"
  className="mb-4"
  showLabel={true}
  fallbackPath="/dashboard"
/>
```

**Tanpa Label (Icon Only):**
```jsx
<BackButton showLabel={false} />
```

**Dengan Custom onClick:**
```jsx
<BackButton
  onClick={() => {
    // Custom logic sebelum kembali
    console.log('Kembali ke halaman sebelumnya');
    // Navigasi akan tetap dilakukan oleh BackButton
  }}
/>
```

### **Opsi 2: Menggunakan useBackNavigation Hook**

```jsx
import useBackNavigation from '../hooks/useBackNavigation';

function MyPage() {
  const goBack = useBackNavigation('/dashboard');

  return (
    <div>
      <button onClick={goBack}>
        Kembali
      </button>
      {/* Konten halaman */}
    </div>
  );
}
```

**Dengan Custom Logic:**
```jsx
import useBackNavigation from '../hooks/useBackNavigation';

function MyPage() {
  const goBack = useBackNavigation('/dashboard');

  const handleBack = () => {
    // Custom logic sebelum kembali
    if (hasUnsavedChanges) {
      if (confirm('Ada perubahan yang belum disimpan. Yakin ingin kembali?')) {
        goBack();
      }
    } else {
      goBack();
    }
  };

  return (
    <div>
      <button onClick={handleBack}>
        Kembali
      </button>
    </div>
  );
}
```

### **Opsi 3: Menggunakan window.history.back() (Lama)**

Masih bisa digunakan, tapi kurang optimal untuk PWA:

```jsx
<button onClick={() => window.history.back()}>
  Kembali
</button>
```

**⚠️ Catatan:** Metode ini tidak memiliki fallback jika tidak ada history.

---

## 📋 Contoh Implementasi di Halaman

### **Contoh 1: Halaman Detail Produk**

```jsx
import BackButton from '../components/ui/BackButton';

function ProductDetailPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <h1>Detail Produk</h1>
      </div>
      {/* Konten detail produk */}
    </div>
  );
}
```

### **Contoh 2: Halaman Form dengan Konfirmasi**

```jsx
import useBackNavigation from '../hooks/useBackNavigation';
import { useState } from 'react';

function ProductFormPage() {
  const goBack = useBackNavigation('/products');
  const [hasChanges, setHasChanges] = useState(false);

  const handleBack = () => {
    if (hasChanges) {
      if (confirm('Ada perubahan yang belum disimpan. Yakin ingin kembali?')) {
        goBack();
      }
    } else {
      goBack();
    }
  };

  return (
    <div>
      <button onClick={handleBack}>
        Kembali
      </button>
      {/* Form */}
    </div>
  );
}
```

### **Contoh 3: Halaman dengan Multiple Navigation Options**

```jsx
import BackButton from '../components/ui/BackButton';
import { useNavigate } from 'react-router-dom';

function OrderDetailPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BackButton />
        <button onClick={() => navigate('/orders')}>
          Daftar Pesanan
        </button>
        <button onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
      </div>
      {/* Konten detail pesanan */}
    </div>
  );
}
```

---

## 🎨 Customization

### **BackButton Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fallbackPath` | `string` | `'/'` | Path fallback jika tidak ada history |
| `variant` | `string` | `'ghost'` | Variant button (default, outline, ghost, etc.) |
| `size` | `string` | `'sm'` | Size button (sm, default, lg, icon) |
| `className` | `string` | `undefined` | Custom className |
| `showLabel` | `boolean` | `true` | Tampilkan label "Kembali" |
| `onClick` | `Function` | `undefined` | Custom onClick handler |

### **useBackNavigation Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fallbackPath` | `string` | `'/'` | Path fallback jika tidak ada history |

---

## 🔍 Cara Kerja di PWA

### **1. Browser History API**
- Menggunakan `window.history.length` untuk cek apakah ada history
- Jika `history.length > 1`, gunakan `navigate(-1)` untuk kembali
- Jika tidak ada history, navigasi ke `fallbackPath`

### **2. React Router Integration**
- Menggunakan `useNavigate()` dari React Router
- Navigasi dengan `navigate(-1)` untuk kembali
- Fallback dengan `navigate(fallbackPath, { replace: true })`

### **3. PWA Context**
- Di PWA, browser back button tetap berfungsi
- BackButton component memberikan alternatif UI untuk navigasi kembali
- Otomatis muncul di Layout header untuk UX yang lebih baik

---

## ✅ Testing

### **Test Cases:**

1. ✅ **Back Button di Layout Header**
   - Muncul saat tidak di dashboard
   - Tersembunyi di dashboard (/)
   - Tersembunyi di mobile, muncul di desktop

2. ✅ **BackButton Component**
   - Navigasi kembali berfungsi
   - Fallback ke path yang benar jika tidak ada history
   - Custom styling berfungsi
   - Custom onClick handler berfungsi

3. ✅ **useBackNavigation Hook**
   - Hook mengembalikan function yang benar
   - Navigasi kembali berfungsi
   - Fallback path berfungsi

---

## 📝 Catatan Penting

1. **PWA Support:** ✅
   - Back navigation bekerja dengan baik di PWA
   - Browser back button tetap berfungsi
   - BackButton component memberikan alternatif UI

2. **History Management:**
   - React Router mengelola history secara otomatis
   - `window.history.length` digunakan untuk cek history
   - Fallback path digunakan jika tidak ada history

3. **Best Practices:**
   - Gunakan BackButton component untuk konsistensi UI
   - Gunakan useBackNavigation hook untuk custom logic
   - Selalu sediakan fallback path yang masuk akal

---

## 🎯 Kesimpulan

✅ **PWA mendukung navigasi kembali** dengan baik!

- ✅ Browser back button berfungsi normal
- ✅ BackButton component tersedia untuk UI yang lebih baik
- ✅ useBackNavigation hook untuk custom logic
- ✅ Auto back button di Layout header untuk UX yang lebih baik

**Gunakan BackButton component atau useBackNavigation hook untuk navigasi kembali yang konsisten di seluruh aplikasi!**
