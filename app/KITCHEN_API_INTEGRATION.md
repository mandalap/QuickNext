# Kitchen Dashboard API Integration

## 📋 Overview

Dokumen ini menjelaskan implementasi integrasi API untuk halaman dapur kitchen yang telah selesai dikerjakan.

## ✅ Yang Telah Diimplementasikan

### 1. Frontend KitchenDashboard.jsx

- **Real-time API Integration**: Dashboard sekarang menggunakan API real-time untuk mengambil data pesanan
- **Outlet Support**: Menambahkan outlet switcher dan filtering berdasarkan outlet yang dipilih
- **Loading States**: Menambahkan loading indicators dan error handling
- **Auto-refresh**: Auto-refresh setiap 30 detik untuk data real-time
- **Keyboard Shortcuts**: Tekan 'R' untuk refresh manual
- **Status Updates**: Tombol untuk mengubah status pesanan (confirmed → preparing → ready)

### 2. Kitchen Service (kitchen.service.js)

- **Outlet Headers**: Menambahkan X-Outlet-Id dan X-Business-Id headers otomatis
- **Error Handling**: Improved error handling dengan toast notifications
- **API Integration**: Terintegrasi dengan endpoint kitchen API

### 3. Backend KitchenController.php

- **Outlet Filtering**: Filter pesanan berdasarkan outlet yang dipilih
- **Role-based Access**: Super admin/owner bisa lihat semua outlet, staff hanya outlet yang di-assign
- **Business Filtering**: Filter berdasarkan business ID
- **Enhanced Relationships**: Load order items, products, dan table data

## 🔧 Fitur Utama

### Dashboard Features

- **Real-time Stats**: Menampilkan jumlah pesanan pending, cooking, dan ready
- **Order Cards**: Menampilkan detail pesanan dengan priority badges
- **Status Management**: Tombol untuk update status pesanan
- **Outlet Switcher**: Dropdown untuk pilih outlet (jika multiple outlets)
- **Auto-refresh**: Refresh otomatis setiap 30 detik
- **Keyboard Shortcuts**: Tekan R untuk refresh manual

### API Features

- **Outlet Filtering**: API hanya return pesanan dari outlet yang dipilih
- **Role-based Access**: Access control berdasarkan role user
- **Real-time Updates**: Status update langsung ke database
- **Error Handling**: Proper error responses dan validation

## 🎯 Status Mapping

| API Status  | Display Status | Action Button       |
| ----------- | -------------- | ------------------- |
| `confirmed` | Menunggu       | "Mulai Masak"       |
| `preparing` | Sedang Dimasak | "Tandai Siap"       |
| `ready`     | Siap Diambil   | (Read-only)         |
| `completed` | Selesai        | (Tidak ditampilkan) |

## 🔄 Data Flow

```
1. User Login → Select Outlet → Load Kitchen Dashboard
2. Dashboard calls kitchenService.getOrders() with outlet headers
3. Backend filters orders by outlet_id and business_id
4. Frontend displays orders with real-time stats
5. User clicks status button → API call to update status
6. Auto-refresh every 30 seconds keeps data fresh
```

## 🚀 Cara Penggunaan

### Untuk Kitchen Staff

1. Login dengan role 'kitchen'
2. Pilih outlet (jika multiple outlets)
3. Lihat pesanan yang perlu diproses
4. Klik "Mulai Masak" untuk mulai proses
5. Klik "Tandai Siap" ketika selesai
6. Pesanan akan otomatis refresh

### Untuk Admin/Owner

1. Login dengan role 'admin' atau 'owner'
2. Bisa lihat pesanan dari semua outlet
3. Bisa switch outlet untuk monitoring
4. Semua fitur kitchen staff tersedia

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

- `GET /api/v1/kitchen/orders` - Get all active orders
- `GET /api/v1/kitchen/orders/pending` - Get pending orders only
- `POST /api/v1/kitchen/orders/{id}/status` - Update order status

### Database Filtering

```php
// Backend filtering logic
$query = Order::with(['orderItems.product', 'table'])
    ->whereIn('status', ['confirmed', 'preparing', 'ready']);

if ($outletId && !in_array($user->role, ['super_admin', 'owner'])) {
    $query->where('outlet_id', $outletId);
}

if ($businessId) {
    $query->where('business_id', $businessId);
}
```

## 🎨 UI/UX Improvements

- **Loading States**: Spinner saat loading data
- **Empty States**: Pesan ketika tidak ada pesanan
- **Error Handling**: Toast notifications untuk error
- **Visual Feedback**: Button states saat updating
- **Responsive Design**: Works on mobile dan desktop
- **Accessibility**: Keyboard shortcuts dan proper ARIA labels

## 🔮 Future Enhancements

- **WebSocket Integration**: Real-time updates tanpa polling
- **Sound Notifications**: Audio alerts untuk pesanan baru
- **Print Integration**: Print order slips untuk dapur
- **Timer Display**: Countdown timer untuk setiap pesanan
- **Bulk Actions**: Update multiple orders sekaligus
- **Analytics**: Kitchen performance metrics

## 📝 Testing Checklist

- [ ] Login dengan role kitchen
- [ ] Pilih outlet dan lihat pesanan
- [ ] Update status pesanan
- [ ] Test auto-refresh
- [ ] Test keyboard shortcuts
- [ ] Test error handling
- [ ] Test dengan multiple outlets
- [ ] Test dengan role admin/owner

---

**Status**: ✅ COMPLETED  
**Date**: 2025-01-15  
**Next**: Ready for production testing
