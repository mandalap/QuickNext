# 📋 Panduan Print Struk untuk Printer Termal Eppos

## ✅ Fitur yang Telah Ditambahkan

### 1. **CSS Thermal Printer**

- ✅ File: `app/frontend/src/styles/thermal-printer.css`
- ✅ Ukuran: 80mm (default) dan 58mm (untuk printer kecil)
- ✅ Font: Courier New (monospace) untuk konsistensi
- ✅ Optimized untuk print thermal

### 2. **Komponen yang Sudah Diupdate**

- ✅ `PrintReceiptModal.jsx` - Print struk transaksi
- ✅ `PrintShiftClosingReceipt.jsx` - Print laporan tutup kasir

## 📏 Ukuran Print

### Printer 80mm (Standard)

- Width: 80mm
- Font size: 10pt
- Padding: 5mm
- Line height: 1.2

### Printer 58mm (Compact)

- Width: 58mm
- Font size: 8pt
- Padding: 3mm
- Line height: 1.2

## 🖨️ Cara Menggunakan

### 1. **Print Struk Transaksi**

1. Setelah transaksi berhasil, klik tombol "Print Struk"
2. Modal print akan muncul dengan preview
3. Klik tombol "Print" untuk print langsung
4. Pilih printer termal di dialog print browser
5. Atau gunakan tombol "Download" untuk save sebagai file

### 2. **Print Laporan Tutup Kasir**

1. Di halaman Cashier Closing, klik tombol "Print Struk"
2. Modal print akan muncul dengan laporan lengkap
3. Klik tombol "Print (Eppos)" untuk print langsung
4. Atau klik "Download (Eppos)" untuk download file ESC/POS commands

### 3. **Setup Printer di Browser**

#### Chrome/Edge:

1. Buka Settings → Printers
2. Add printer → Pilih printer termal
3. Atau gunakan "Save as PDF" lalu print ke printer termal

#### Firefox:

1. File → Print
2. Pilih printer termal
3. Set page size ke "Custom" → 80mm width

## 🎨 Format Struk

### Header

- Nama bisnis (bold, center, uppercase)
- Alamat
- Telepon
- Email

### Informasi Transaksi

- Outlet name
- Struk number
- Order number
- Tanggal & waktu
- Kasir name
- Customer name (jika ada)

### Items

- Nama produk
- Quantity
- Harga satuan
- Subtotal

### Totals

- Subtotal
- Pajak
- Diskon (jika ada)
- **TOTAL** (bold)

### Payment

- Metode pembayaran
- Jumlah bayar
- Kembalian

### Footer

- Pesan terima kasih
- Catatan return policy
- Waktu print

## 🔧 Konfigurasi CSS

### Untuk Printer 80mm (Default)

```css
@page {
  size: 80mm auto;
  margin: 0;
}
```

### Untuk Printer 58mm

Tambahkan di browser print settings:

- Page size: Custom
- Width: 58mm
- Height: Auto

Atau gunakan media query di CSS:

```css
@media print and (max-width: 58mm) {
  /* Styles untuk 58mm */
}
```

## 📱 Preview di Browser

Struk akan terlihat seperti struk asli di browser dengan:

- Width: 80mm (atau 58mm untuk mobile)
- Font: Courier New
- Background: Putih
- Shadow: Ringan untuk preview

## 🖨️ Print Settings yang Direkomendasikan

### Browser Print Dialog:

1. **Printer**: Pilih printer termal Eppos
2. **Pages**: All
3. **Layout**: Portrait
4. **Paper size**: Custom (80mm x auto) atau A4
5. **Margins**: None/Minimal
6. **Scale**: 100%
7. **Background graphics**: Enabled (untuk border/line)

### Untuk Eppos Direct Print:

Jika menggunakan Eppos browser extension:

1. Install Eppos extension
2. Connect printer
3. Klik "Print (Eppos)" button
4. Struk akan langsung terprint

## 🐛 Troubleshooting

### Struk Terlalu Besar/Kecil

- Cek page size di browser print settings
- Pastikan menggunakan ukuran 80mm atau 58mm
- Adjust scale jika perlu

### Font Tidak Terlihat Jelas

- Pastikan printer termal dalam kondisi baik
- Cek density setting di printer
- Pastikan kertas termal tidak terlalu lama

### Struk Terpotong

- Cek margin settings (harus 0 atau minimal)
- Pastikan page size sesuai dengan lebar kertas
- Cek printer settings untuk paper width

### Print Tidak Muncul

- Pastikan printer termal terhubung
- Cek printer status (online/offline)
- Restart printer jika perlu
- Coba print test page dari printer settings

## 📝 Catatan

1. **Font**: Menggunakan Courier New untuk konsistensi dan readability di thermal printer
2. **Color**: Semua text hitam (thermal printer tidak support color)
3. **Images**: Logo/gambar akan di-print sebagai grayscale
4. **Line breaks**: Menggunakan dashed line untuk separator
5. **Page breaks**: Dihindari untuk menjaga kontinuitas struk

## 🔄 Update Terbaru

- ✅ Added thermal printer CSS dengan ukuran 80mm dan 58mm
- ✅ Updated PrintReceiptModal dengan thermal printer styles
- ✅ Updated PrintShiftClosingReceipt dengan thermal printer styles
- ✅ Support untuk preview di browser
- ✅ Optimized untuk print langsung ke printer termal
