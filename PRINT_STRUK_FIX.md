# 🔧 Perbaikan Print Struk - Full Page Issue

## 📋 Masalah yang Ditemukan

Ketika melakukan print struk, malah print 1 halaman penuh daripada hanya bagian struk saja. Ini terjadi karena:

1. **Dialog tidak disembunyikan saat print** - DialogContent dan dialog overlay masih terlihat saat print
2. **CSS tidak spesifik untuk dialog elements** - Tidak ada aturan untuk menyembunyikan dialog saat print
3. **Handle print yang sederhana** - `window.print()` tanpa setting yang proper

---

## ✅ Perbaikan yang Dilakukan

### 1. **File: `app/frontend/src/styles/thermal-printer.css`**

#### Perubahan A: Tambah `!important` pada reset margin/padding

```css
/* SEBELUM */
* {
  margin: 0;
  padding: 0;
}

/* SESUDAH */
* {
  margin: 0 !important;
  padding: 0 !important;
}
```

**Alasan:** Memastikan tidak ada margin/padding dari element lain yang override

---

#### Perubahan B: Hapus padding dari body dan tambah height: auto

```css
/* SEBELUM */
body {
  padding: 5mm;
}

/* SESUDAH */
body {
  padding: 0;
}

html,
body {
  height: auto; /* Tambah ini */
}
```

**Alasan:** Padding bisa menyebabkan halaman jadi lebih besar dari seharusnya

---

#### Perubahan C: Sembunyikan semua dialog elements

```css
/* SEBELUM */
.no-print,
button,
.print\\:hidden {
  display: none !important;
}

/* SESUDAH */
.no-print,
button,
.print\\:hidden,
[data-dialog-overlay],
[role="dialog"] > * > button,
dialog,
.dialog-overlay,
.dialog-header,
.dialog-close {
  display: none !important;
}

/* Tambah ini untuk hide semua UI elemen */
body > * {
  display: none !important;
}

/* Tampilkan hanya receipt content */
.receipt-content,
.thermal-receipt {
  display: block !important;
}
```

**Alasan:** Memastikan hanya receipt content yang tercetak, semua UI element disembunyikan

---

#### Perubahan D: Tambah spesifik dialog print styles

```css
/* Dialog print styles */
[role="dialog"],
dialog {
  display: none !important;
}

/* Hide dialog overlay and content container except receipt */
.dialog-overlay,
.DialogContent {
  display: none !important;
}

/* Ensure receipt content is visible */
.receipt-content.thermal-receipt {
  display: block !important;
  margin: 0;
  padding: 0;
  width: 80mm;
  max-width: 80mm;
}
```

**Alasan:** Dialog dari UI framework masih bisa terlihat, perlu hide secara eksplisit

---

#### Perubahan E: Hapus scrollbar saat print

```css
/* Remove all scrollbars during print */
@media print {
  ::-webkit-scrollbar {
    display: none;
  }

  * {
    scroll-behavior: auto !important;
  }
}
```

**Alasan:** Scrollbar tidak perlu dicetak

---

### 2. **File: `app/frontend/src/components/modals/PrintReceiptModal.jsx`**

#### Perubahan: Update handlePrint function

**SEBELUM:**

```jsx
const handlePrint = () => {
  window.print();
};
```

**SESUDAH:**

```jsx
const handlePrint = () => {
  // Focus on receipt content only
  const printWindow = window.open("", "_blank");
  const receiptElement = document.querySelector(".receipt-content");

  if (!receiptElement) {
    console.error("Receipt element not found");
    return;
  }

  // Clone receipt element and wrap in proper HTML
  const receiptClone = receiptElement.cloneNode(true);
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Struk Pembayaran</title>
      <link rel="stylesheet" href="${window.location.origin}/src/styles/thermal-printer.css">
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
          padding: 0;
        }
        * {
          margin: 0;
          padding: 0;
        }
        body {
          width: 80mm;
          margin: 0;
          padding: 0;
          font-family: 'Courier New', monospace;
        }
        .receipt-content {
          width: 100%;
          padding: 0;
        }
      </style>
    </head>
    <body>
      ${receiptClone.innerHTML}
      <script>
        window.onload = function() {
          window.print();
          window.close();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
```

**Alasan:**

- Membuat window baru yang hanya berisi receipt content
- Menghindari dialog overlay dan element lain
- CSS di-link langsung untuk memastikan style tercopy dengan benar
- Auto close window setelah print dialog

---

## 🧪 Testing

Setelah perbaikan, lakukan test:

1. **Buka modal Print Struk**
2. **Klik tombol "Print"**
3. **Di Print dialog yang muncul:**
   - Pastikan hanya struk yang terlihat
   - Tidak ada dialog overlay atau header
   - Ukuran sesuai 80mm
   - Tidak ada halaman kosong

---

## 📊 Hasil yang Diharapkan

### Sebelum Perbaikan ❌

```
┌─────────────────────────────────────┐
│  [Dialog Header]                    │
│  [Dialog Buttons]                   │
│  ┌─────────────────────────────────┐│
│  │  KASIR POS SYSTEM              ││
│  │  (receipt content)              ││
│  │                                 ││
│  │ ≈ 4-5 baris                     ││
│  └─────────────────────────────────┘│
│  [Footer Dialog]                    │
│                                     │
│  [Banyak halaman kosong]            │
└─────────────────────────────────────┘
```

### Sesudah Perbaikan ✅

```
KASIR POS SYSTEM
Alamat Outlet
Tel: 08123456789

================================
Struk: STR-001
Order: ORD-001
Tanggal: 06 Jan 2026

ITEM          QTY  HARGA  SUBTOTAL
Kopi           2   Rp25K  Rp50K
Nasi           1   Rp30K  Rp30K

Subtotal:           Rp80K
Pajak (10%):        Rp8K
TOTAL:              Rp88K

Metode: TUNAI
Kembalian:          Rp12K

Terima kasih!
```

---

## 🎯 Benefit

✅ **Hemat kertas** - Hanya print struk yang diperlukan  
✅ **Cepat** - Tidak ada halaman kosong  
✅ **Rapi** - Format thermal printer 80mm proper  
✅ **Professional** - Struk tercetak dengan baik

---

## 🔍 Catatan Penting

- Pastikan CSS file di-import di component
- Jika masih print 1 halaman penuh, cek:
  - Browser developer tools → Elements → Check dialog ada atau tidak
  - Print preview di dialog
  - Setting printer (margin/scale)

---

## 📝 Files Modified

1. `app/frontend/src/styles/thermal-printer.css`
2. `app/frontend/src/components/modals/PrintReceiptModal.jsx`
