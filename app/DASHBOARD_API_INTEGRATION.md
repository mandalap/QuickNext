# Dashboard API Integration

## 📋 Overview

Dokumen ini menjelaskan implementasi integrasi API untuk halaman dashboard utama yang telah selesai dikerjakan dengan filter per outlet.

## ✅ Yang Telah Diimplementasikan

### 1. Frontend Dashboard.jsx

- **Real-time API Integration**: Dashboard sekarang menggunakan API real-time untuk mengambil data penjualan, pesanan, dan produk
- **Outlet Support**: Menambahkan outlet switcher dan filtering berdasarkan outlet yang dipilih
- **Loading States**: Menambahkan loading indicators dan error handling
- **Auto-refresh**: Auto-refresh setiap 5 menit untuk data real-time
- **Keyboard Shortcuts**: Tekan 'R' untuk refresh manual
- **Dynamic Stats**: Stats cards menggunakan data real dari API
- **Recent Orders**: Menampilkan pesanan terbaru dengan data real
- **Top Products**: Menampilkan produk terlaris dengan data real

### 2. API Integration

- **Sales Service**: Terintegrasi dengan salesService untuk data penjualan dan pesanan
- **Product Service**: Terintegrasi dengan productService untuk data produk terlaris
- **Outlet Headers**: Menggunakan X-Outlet-Id dan X-Business-Id headers otomatis
- **Error Handling**: Improved error handling dengan toast notifications

### 3. Data Management

- **Real-time Stats**: Total penjualan, transaksi, pelanggan, dan produk terjual
- **Additional Metrics**: Rata-rata transaksi, konversi, rating, dan target harian
- **Order Management**: Recent orders dengan detail lengkap
- **Product Analytics**: Top selling products dengan revenue

## 🔧 Fitur Utama

### Dashboard Features

- **Real-time Stats**: Menampilkan data penjualan, transaksi, pelanggan, dan produk
- **Outlet Switcher**: Dropdown untuk pilih outlet (jika multiple outlets)
- **Auto-refresh**: Refresh otomatis setiap 5 menit
- **Keyboard Shortcuts**: Tekan R untuk refresh manual
- **Loading States**: Spinner saat loading data
- **Empty States**: Pesan ketika tidak ada data
- **Error Handling**: Toast notifications untuk error

### API Features

- **Outlet Filtering**: API hanya return data dari outlet yang dipilih
- **Role-based Access**: Access control berdasarkan role user
- **Real-time Updates**: Data update secara real-time
- **Error Handling**: Proper error responses dan validation

## 🎯 Data Sources

### Stats Cards

- **Total Penjualan**: `salesService.getStats()` → `total_sales`
- **Jumlah Transaksi**: `salesService.getStats()` → `total_transactions`
- **Pelanggan Aktif**: `salesService.getStats()` → `unique_customers`
- **Produk Terjual**: `salesService.getStats()` → `total_items`

### Additional Stats

- **Rata-rata Transaksi**: `salesService.getStats()` → `average_transaction`
- **Konversi Pelanggan**: `salesService.getStats()` → `conversion_rate`
- **Rating Pelanggan**: `salesService.getStats()` → `average_rating`
- **Target Harian**: `salesService.getStats()` → `daily_target_percentage`

### Recent Orders

- **Data Source**: `salesService.getOrders()` dengan limit 5
- **Fields**: order_number, customer, total_amount, status, created_at, table, payment_method

### Top Products

- **Data Source**: `productService.getTopSelling()` dengan limit 5
- **Fields**: name, quantity_sold, total_revenue

## 🔄 Data Flow

```
1. User Login → Select Outlet → Load Dashboard
2. Dashboard calls salesService.getStats() with outlet headers
3. Dashboard calls salesService.getOrders() for recent orders
4. Dashboard calls productService.getTopSelling() for top products
5. Backend filters data by outlet_id and business_id
6. Frontend displays data with real-time stats
7. Auto-refresh every 5 minutes keeps data fresh
```

## 🚀 Cara Penggunaan

### Untuk Admin/Owner

1. Login dengan role 'admin' atau 'owner'
2. Pilih outlet (jika multiple outlets)
3. Lihat dashboard dengan data real-time
4. Monitor penjualan, transaksi, dan performa outlet
5. Switch outlet untuk monitoring multiple outlets

### Untuk Manager

1. Login dengan role 'manager'
2. Pilih outlet yang di-assign
3. Lihat dashboard dengan data outlet tersebut
4. Monitor performa outlet yang dikelola

## 🔧 Technical Details

### Headers yang Dikirim

```javascript
{
  'Authorization': 'Bearer {token}',
  'X-Business-Id': businessId,
  'X-Outlet-Id': outletId,
  'Content-Type': 'application/json'
}
```

### API Endpoints

- `GET /api/v1/sales/stats` - Get sales statistics
- `GET /api/v1/sales/orders` - Get recent orders
- `GET /api/v1/products/top-selling` - Get top selling products

### Data Formatting

```javascript
// Currency formatting
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Percentage formatting
const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`;
};
```

## 🎨 UI/UX Improvements

- **Loading States**: Spinner saat loading data
- **Empty States**: Pesan ketika tidak ada data
- **Error Handling**: Toast notifications untuk error
- **Visual Feedback**: Loading indicators dan proper states
- **Responsive Design**: Works on mobile dan desktop
- **Accessibility**: Keyboard shortcuts dan proper ARIA labels
- **Outlet Information**: Display current outlet dan business info

## 🔮 Future Enhancements

- **WebSocket Integration**: Real-time updates tanpa polling
- **Advanced Analytics**: Charts dan graphs untuk visualisasi data
- **Date Range Filter**: Filter data berdasarkan periode tertentu
- **Export Functionality**: Export data ke Excel/PDF
- **Customizable Widgets**: User bisa customize dashboard layout
- **Performance Metrics**: Response time dan throughput metrics
- **Alert System**: Notifikasi untuk target tidak tercapai

## 📝 Testing Checklist

- [ ] Login dengan role admin/owner
- [ ] Pilih outlet dan lihat dashboard
- [ ] Test auto-refresh functionality
- [ ] Test keyboard shortcuts (R key)
- [ ] Test error handling
- [ ] Test dengan multiple outlets
- [ ] Test dengan data kosong
- [ ] Test loading states
- [ ] Test outlet switching

## 🔗 Integration Points

### Sales Management Integration

- **Shared Data**: Dashboard menggunakan data dari sales management
- **Real-time Sync**: Data sinkron antara dashboard dan sales management
- **Consistent Formatting**: Format data yang konsisten

### Product Management Integration

- **Top Products**: Dashboard menampilkan data dari product management
- **Sales Analytics**: Analisis penjualan produk terintegrasi

### Multi-Outlet Support

- **Outlet Filtering**: Semua data difilter berdasarkan outlet
- **Business Context**: Data dalam konteks business yang dipilih
- **Role-based Access**: Access control berdasarkan role dan outlet assignment

---

**Status**: ✅ COMPLETED  
**Date**: 2025-01-15  
**Next**: Ready for production testing
