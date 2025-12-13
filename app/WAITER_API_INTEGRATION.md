# Waiter Dashboard API Integration

## 📋 Overview

Dokumen ini menjelaskan implementasi integrasi API untuk halaman waiter/meja yang telah selesai dikerjakan.

## ✅ Yang Telah Diimplementasikan

### 1. Frontend WaiterDashboard.jsx

- **Real-time API Integration**: Dashboard sekarang menggunakan API real-time untuk mengambil data meja dan pesanan
- **Outlet Support**: Menambahkan outlet switcher dan filtering berdasarkan outlet yang dipilih
- **Loading States**: Menambahkan loading indicators dan error handling
- **Auto-refresh**: Auto-refresh setiap 30 detik untuk data real-time
- **Keyboard Shortcuts**: Tekan 'R' untuk refresh manual
- **Table Status Management**: Tombol untuk mengubah status meja (available ↔ occupied)
- **Order Management**: Menampilkan pesanan aktif dari kitchen API

### 2. Table Service (table.service.js)

- **Outlet Headers**: Menambahkan X-Outlet-Id dan X-Business-Id headers otomatis
- **Error Handling**: Improved error handling dengan toast notifications
- **API Integration**: Terintegrasi dengan endpoint table API

### 3. Backend TableController.php

- **Outlet Filtering**: Filter meja berdasarkan outlet yang dipilih
- **Role-based Access**: Super admin/owner bisa lihat semua outlet, staff hanya outlet yang di-assign
- **Business Filtering**: Filter berdasarkan business ID
- **Access Control**: Validasi akses untuk update status meja

## 🔧 Fitur Utama

### Dashboard Features

- **Real-time Stats**: Menampilkan jumlah meja terisi, tersedia, dan pesanan aktif
- **Table Cards**: Menampilkan detail meja dengan status badges
- **Status Management**: Tombol untuk update status meja
- **Outlet Switcher**: Dropdown untuk pilih outlet (jika multiple outlets)
- **Auto-refresh**: Refresh otomatis setiap 30 detik
- **Keyboard Shortcuts**: Tekan R untuk refresh manual
- **Order Integration**: Menampilkan pesanan aktif dari kitchen

### API Features

- **Outlet Filtering**: API hanya return meja dari outlet yang dipilih
- **Role-based Access**: Access control berdasarkan role user
- **Real-time Updates**: Status update langsung ke database
- **Error Handling**: Proper error responses dan validation

## 🎯 Status Mapping

| API Status  | Display Status | Action Button |
| ----------- | -------------- | ------------- |
| `available` | Tersedia       | "Terisi"      |
| `occupied`  | Terisi         | "Kosongkan"   |
| `reserved`  | Reservasi      | (Read-only)   |

## 🔄 Data Flow

```
1. User Login → Select Outlet → Load Waiter Dashboard
2. Dashboard calls tableService.getAll() with outlet headers
3. Backend filters tables by outlet_id and business_id
4. Dashboard calls kitchenService.getOrders() for active orders
5. Frontend displays tables and orders with real-time stats
6. User clicks status button → API call to update table status
7. Auto-refresh every 30 seconds keeps data fresh
```

## 🚀 Cara Penggunaan

### Untuk Waiter Staff

1. Login dengan role 'waiter'
2. Pilih outlet (jika multiple outlets)
3. Lihat status meja dan pesanan aktif
4. Klik "Terisi" untuk menandai meja terisi
5. Klik "Kosongkan" untuk menandai meja tersedia
6. Antarkan pesanan yang sudah siap dari dapur

### Untuk Admin/Owner

1. Login dengan role 'admin' atau 'owner'
2. Bisa lihat meja dari semua outlet
3. Bisa switch outlet untuk monitoring
4. Semua fitur waiter staff tersedia

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

- `GET /api/v1/tables` - Get all tables for outlet
- `POST /api/v1/tables/{id}/status` - Update table status
- `GET /api/v1/kitchen/orders` - Get active orders (from kitchen API)

### Database Filtering

```php
// Backend filtering logic
$query = Table::query();

if ($businessId) {
    $query->where('business_id', $businessId);
}

if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
    $query->where('outlet_id', $outletId);
}
```

## 🎨 UI/UX Improvements

- **Loading States**: Spinner saat loading data
- **Empty States**: Pesan ketika tidak ada meja atau pesanan
- **Error Handling**: Toast notifications untuk error
- **Visual Feedback**: Button states saat updating
- **Responsive Design**: Works on mobile dan desktop
- **Accessibility**: Keyboard shortcuts dan proper ARIA labels
- **Outlet Information**: Display current outlet dan business info

## 🔮 Future Enhancements

- **WebSocket Integration**: Real-time updates tanpa polling
- **Sound Notifications**: Audio alerts untuk pesanan baru
- **Table Layout**: Visual table layout dengan drag & drop
- **Reservation Management**: Handle table reservations
- **Guest Count**: Track number of guests per table
- **Order History**: View order history per table
- **Analytics**: Table utilization metrics

## 📝 Testing Checklist

- [ ] Login dengan role waiter
- [ ] Pilih outlet dan lihat meja
- [ ] Update status meja
- [ ] Test auto-refresh
- [ ] Test keyboard shortcuts
- [ ] Test error handling
- [ ] Test dengan multiple outlets
- [ ] Test dengan role admin/owner
- [ ] Test order integration dari kitchen

## 🔗 Integration Points

### Kitchen Dashboard Integration

- **Shared Orders**: Waiter dashboard menampilkan pesanan dari kitchen
- **Status Sync**: Status pesanan sinkron antara kitchen dan waiter
- **Real-time Updates**: Kedua dashboard update secara real-time

### Cashier Integration

- **Order Creation**: Quick action untuk buat pesanan baru
- **Table Assignment**: Meja bisa di-assign saat buat pesanan

---

**Status**: ✅ COMPLETED  
**Date**: 2025-01-15  
**Next**: Ready for production testing
