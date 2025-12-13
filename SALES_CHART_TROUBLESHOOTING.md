# Troubleshooting & Usage Guide - Halaman Grafik Penjualan

## 🔧 Troubleshooting

### Error: Module not found: Error: Can't resolve 'recharts'

**Solusi:**

```bash
cd app/frontend
npm install recharts --save
```

### Error: Module not found: Error: Can't resolve 'date-fns'

**Solusi:**

```bash
cd app/frontend
npm install date-fns --save
```

### Error: Cannot resolve '@/components/ui/button'

**Solusi:**
Pastikan import path menggunakan relative path:

```javascript
// ❌ Salah
import { buttonVariants } from "@/components/ui/button";

// ✅ Benar
import { buttonVariants } from "./button";
```

### Build Warning: Asset size limit exceeded

**Penjelasan:**
Ini adalah warning normal karena Recharts library cukup besar. Untuk production, pertimbangkan:

- Code splitting untuk chart components
- Lazy loading untuk halaman grafik
- Bundle analysis untuk optimasi lebih lanjut

## 🚀 Cara Menggunakan

### 1. Akses Halaman

- Login sebagai Owner/Admin
- Navigate ke sidebar → "Grafik Penjualan"
- Atau langsung ke URL: `/reports/sales-chart`

### 2. Filter Data

- **Periode**: Pilih dari dropdown (Hari Ini, 7 Hari, 30 Hari, dll)
- **Tampilan**: Pilih jenis chart (Per Jam, Harian, Mingguan, Bulanan)
- **Outlet**: Filter berdasarkan outlet tertentu
- **Tanggal Kustom**: Untuk periode spesifik

### 3. Interaksi dengan Charts

- **Hover**: Lihat detail data pada tooltip
- **Tabs**: Switch antara Sales, Categories, Payments, Products
- **View Type**: Toggle antara Penjualan dan Transaksi

### 4. Export Data

- Klik tombol "Export" untuk download data
- Format: CSV/Excel (akan diimplementasikan)

## 📊 Jenis Chart yang Tersedia

### 1. Sales Chart (Area/Bar)

- **Area Chart**: Trend penjualan dengan fill area
- **Bar Chart**: Perbandingan data dengan bars
- **Data**: Sales amount dan transaction count

### 2. Category Chart (Pie)

- **Distribusi**: Penjualan per kategori produk
- **Data**: Sales amount, quantity sold, order count

### 3. Payment Chart (Horizontal Bar)

- **Metode**: Distribusi pembayaran
- **Data**: Sales amount, transaction count, percentage

### 4. Products Chart (Vertical Bar)

- **Top Products**: Produk terlaris
- **Data**: Sales amount, quantity sold, order count

## 🔍 Data yang Ditampilkan

### Summary Cards

- **Total Penjualan**: Total revenue dengan growth percentage
- **Total Transaksi**: Jumlah transaksi dengan rata-rata
- **Rata-rata Transaksi**: Nilai transaksi rata-rata
- **Pertumbuhan**: Perbandingan dengan periode sebelumnya

### Data Tables

- **Top 5 Produk**: Produk dengan penjualan tertinggi
- **Metode Pembayaran**: Distribusi pembayaran dengan persentase

## ⚡ Performance Tips

### 1. Filter Optimization

- Gunakan filter yang spesifik untuk mengurangi data
- Hindari range tanggal yang terlalu besar
- Pilih chart type yang sesuai dengan data

### 2. Browser Optimization

- Gunakan browser modern (Chrome, Firefox, Safari)
- Pastikan JavaScript enabled
- Clear cache jika ada masalah loading

### 3. Network Optimization

- Pastikan koneksi internet stabil
- Gunakan WiFi untuk data yang besar
- Tunggu loading selesai sebelum interaksi

## 🐛 Common Issues

### 1. Chart Tidak Muncul

**Kemungkinan Penyebab:**

- Data kosong untuk periode yang dipilih
- Error API connection
- Browser compatibility issue

**Solusi:**

- Cek filter periode
- Refresh halaman
- Cek console untuk error

### 2. Data Tidak Update

**Kemungkinan Penyebab:**

- Cache browser
- API response error
- Filter tidak ter-apply

**Solusi:**

- Klik tombol "Refresh"
- Clear browser cache
- Cek network tab di DevTools

### 3. Loading Terlalu Lama

**Kemungkinan Penyebab:**

- Data terlalu besar
- Network lambat
- Server response lambat

**Solusi:**

- Kurangi range tanggal
- Pilih outlet tertentu
- Tunggu loading selesai

## 🔧 Development Notes

### File Structure

```
app/frontend/src/components/reports/
├── SalesChartReportNew.jsx     # Main component
├── SalesChartFilters.jsx       # Filter component
└── SalesChartReport.jsx        # Legacy component

app/backend/app/Http/Controllers/Api/
└── ReportController.php        # API controller

app/backend/routes/
└── api.php                     # API routes
```

### Dependencies

```json
{
  "recharts": "^2.8.0",
  "date-fns": "^4.1.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

### API Endpoints

- `GET /v1/reports/sales/chart-data` - Chart data
- `GET /v1/reports/sales/summary` - Summary data
- `GET /v1/reports/payment-types` - Payment data

## 📱 Mobile Compatibility

### Responsive Design

- Charts auto-resize untuk mobile
- Touch-friendly controls
- Optimized layout untuk small screens

### Mobile Tips

- Gunakan landscape mode untuk chart yang lebih besar
- Tap untuk melihat tooltip details
- Swipe untuk navigate antara tabs

## 🎯 Future Enhancements

### Planned Features

1. **Real-time Updates**: WebSocket integration
2. **Export Options**: PDF, Excel, PNG export
3. **Advanced Filters**: More granular filtering
4. **Custom Dashboards**: User-customizable layouts
5. **Alert System**: Threshold-based notifications

### Performance Improvements

1. **Data Caching**: Redis caching layer
2. **Lazy Loading**: Component lazy loading
3. **Bundle Splitting**: Code splitting optimization
4. **CDN Integration**: Static asset optimization

---

## 📞 Support

Jika mengalami masalah yang tidak tercantum di sini:

1. **Check Console**: Buka DevTools → Console untuk error messages
2. **Check Network**: Buka DevTools → Network untuk API calls
3. **Check Data**: Pastikan ada data untuk periode yang dipilih
4. **Refresh**: Coba refresh halaman atau clear cache
5. **Contact**: Hubungi tim development untuk bantuan lebih lanjut

**Happy Charting! 📊✨**
