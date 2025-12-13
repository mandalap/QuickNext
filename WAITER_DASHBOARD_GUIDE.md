# 🍽️ WAITER DASHBOARD GUIDE

## **📋 OVERVIEW**

Halaman Waiter Dashboard adalah interface khusus untuk pelayan yang bertugas mengelola meja dan pesanan pelanggan. Waiter dapat melihat status meja, mengelola pesanan aktif, dan membuat pesanan baru.

## **🔐 AKSES WAITER**

### **Login Credentials**
```
Email: waiter@test.com
Password: password123
Role: waiter
```

### **URL Access**
- **Dashboard**: `/tables` (Waiter Dashboard)
- **Buat Pesanan**: `/cashier` (Kasir POS - shared dengan kasir)

## **🏠 WAITER DASHBOARD FEATURES**

### **1. Welcome Banner**
- **Judul**: "Dashboard Pelayan"
- **Deskripsi**: "Kelola meja dan pesanan pelanggan"
- **Waktu**: Menampilkan waktu dan tanggal saat ini
- **Outlet Switcher**: Pilih outlet yang aktif
- **Info Outlet**: Nama outlet dan business

### **2. Statistics Cards**
- **Meja Terisi**: Jumlah meja yang sedang digunakan
- **Pesanan Aktif**: Jumlah pesanan yang sedang diproses
- **Meja Tersedia**: Jumlah meja yang kosong

### **3. Status Meja Section**
- **Grid Layout**: Menampilkan semua meja dalam grid 2 kolom
- **Status Badge**: 
  - 🟢 **Tersedia** (Available)
  - 🔴 **Terisi** (Occupied) 
  - 🟡 **Reservasi** (Reserved)
- **Kapasitas**: Jumlah kursi per meja
- **Quick Actions**: 
  - **Kosongkan**: Ubah status dari Terisi ke Tersedia
  - **Terisi**: Ubah status dari Tersedia ke Terisi

### **4. Pesanan Aktif Section**
- **Order List**: Daftar pesanan yang perlu diperhatikan
- **Order Info**: 
  - Nama meja
  - Nomor pesanan
  - Jumlah item
  - Status pesanan
  - Waktu pesanan
- **Status Badge**:
  - 🟢 **Siap Diantar** (Ready)
  - 🔵 **Dimasak** (Cooking)
  - 🟠 **Menunggu** (Pending)
- **Quick Actions**:
  - **Antarkan**: Untuk pesanan yang sudah siap

### **5. Quick Actions**
- **Buat Pesanan Baru**: Redirect ke halaman Kasir POS
- **Lihat Denah**: Navigate ke halaman denah meja
- **Refresh**: Update data (atau tekan tombol R)

## **🍽️ CARA WAITER MEMBUAT PESANAN**

### **Method 1: Via Waiter Dashboard**
1. **Login** sebagai waiter (`waiter@test.com` / `password123`)
2. **Pilih Outlet** jika ada multiple outlet
3. **Klik "Buat Pesanan Baru"** di section Pesanan Aktif
4. **Redirect ke Kasir POS** (`/cashier`)

### **Method 2: Direct Access**
1. **Login** sebagai waiter
2. **Navigate langsung** ke `/cashier`
3. **Gunakan Kasir POS** untuk membuat pesanan

## **💻 KASIR POS INTERFACE (UNTUK WAITER)**

### **Features yang Tersedia untuk Waiter:**
- **Product Selection**: Pilih produk dari menu
- **Cart Management**: Kelola item di keranjang
- **Customer Selection**: Pilih atau tambah pelanggan
- **Table Assignment**: Assign pesanan ke meja
- **Payment Processing**: Proses pembayaran
- **Receipt Printing**: Cetak struk

### **Workflow Membuat Pesanan:**
1. **Pilih Meja**: Klik meja yang akan dilayani
2. **Pilih Produk**: Browse menu dan tambah ke keranjang
3. **Review Order**: Cek item dan quantity
4. **Add Customer** (Optional): Input data pelanggan
5. **Process Payment**: Pilih metode pembayaran
6. **Complete Order**: Selesaikan pesanan

## **🔄 WAITER WORKFLOW**

### **1. Morning Setup**
- **Login** ke sistem
- **Pilih outlet** yang akan bekerja
- **Cek status meja** - pastikan semua tersedia
- **Review pesanan** dari shift sebelumnya

### **2. During Service**
- **Monitor meja** - update status saat pelanggan datang
- **Take orders** - gunakan Kasir POS untuk input pesanan
- **Track orders** - monitor pesanan yang sedang diproses
- **Deliver orders** - antarkan pesanan yang sudah siap
- **Update table status** - kosongkan meja setelah pelanggan selesai

### **3. Order Management**
- **Pesanan Baru**: Buat via Kasir POS
- **Pesanan Aktif**: Monitor via Waiter Dashboard
- **Status Update**: Update status meja real-time
- **Delivery**: Antarkan pesanan yang ready

## **⌨️ KEYBOARD SHORTCUTS**

- **R**: Refresh data (reload meja dan pesanan)
- **Tab**: Navigate antar elemen
- **Enter**: Confirm actions

## **📱 RESPONSIVE DESIGN**

### **Desktop (1024px+)**
- **2-column grid** untuk meja
- **Full sidebar** dengan semua fitur
- **Large cards** untuk pesanan

### **Tablet (768px-1023px)**
- **2-column grid** untuk meja
- **Collapsible sidebar**
- **Medium cards** untuk pesanan

### **Mobile (< 768px)**
- **1-column grid** untuk meja
- **Hidden sidebar** (hamburger menu)
- **Compact cards** untuk pesanan

## **🔧 TECHNICAL DETAILS**

### **API Endpoints Used:**
- **GET** `/v1/self-service-management/tables` - Get tables
- **PUT** `/v1/self-service-management/tables/{id}/status` - Update table status
- **GET** `/v1/kitchen/orders` - Get active orders
- **POST** `/v1/orders` - Create new order (via Kasir POS)

### **Services Used:**
- `tableService` - Table management
- `kitchenService` - Order management
- `orderService` - Order creation (via Kasir POS)

### **State Management:**
- **Tables**: Array of table objects
- **Active Orders**: Array of order objects
- **Stats**: Real-time statistics
- **Loading States**: UI feedback

## **🎯 BEST PRACTICES**

### **1. Table Management**
- **Update status** segera saat pelanggan datang
- **Kosongkan meja** setelah pelanggan selesai
- **Monitor kapasitas** untuk reservasi

### **2. Order Management**
- **Input pesanan** dengan detail yang jelas
- **Assign ke meja** yang benar
- **Monitor status** pesanan secara berkala
- **Antarkan segera** pesanan yang ready

### **3. Customer Service**
- **Greet customers** saat mereka datang
- **Explain menu** jika diperlukan
- **Check satisfaction** setelah pesanan diantar
- **Handle complaints** dengan sopan

## **🚨 TROUBLESHOOTING**

### **Jika Meja Tidak Muncul:**
1. **Cek outlet** - pastikan outlet dipilih
2. **Refresh data** - tekan R atau klik refresh
3. **Cek koneksi** - pastikan internet stabil

### **Jika Pesanan Tidak Muncul:**
1. **Cek status** - pastikan pesanan dalam status 'ready' atau 'preparing'
2. **Refresh data** - update data pesanan
3. **Cek outlet** - pastikan outlet yang benar

### **Jika Tidak Bisa Buat Pesanan:**
1. **Cek outlet** - pastikan outlet dipilih
2. **Cek business** - pastikan business aktif
3. **Cek subscription** - pastikan owner punya subscription aktif

## **📊 MONITORING & ANALYTICS**

### **Real-time Stats:**
- **Meja Terisi**: Jumlah meja yang sedang digunakan
- **Pesanan Aktif**: Jumlah pesanan yang diproses
- **Meja Tersedia**: Jumlah meja kosong

### **Auto-refresh:**
- **Every 30 seconds** - Data otomatis ter-update
- **Manual refresh** - Tekan R atau klik refresh button

## **🎉 CONCLUSION**

Waiter Dashboard memberikan interface yang user-friendly untuk:

✅ **Table Management** - Kelola status meja real-time
✅ **Order Tracking** - Monitor pesanan aktif
✅ **Order Creation** - Buat pesanan via Kasir POS
✅ **Customer Service** - Layani pelanggan dengan efisien
✅ **Real-time Updates** - Data selalu ter-update

**Waiter dapat bekerja dengan efisien dan memberikan pelayanan terbaik kepada pelanggan!** 🚀

## **📞 USAGE INSTRUCTIONS**

### **Untuk Testing:**
1. **Login** dengan `waiter@test.com` / `password123`
2. **Navigate** ke `/tables` (Waiter Dashboard)
3. **Pilih outlet** jika ada multiple outlet
4. **Test table management** - ubah status meja
5. **Test order creation** - klik "Buat Pesanan Baru"
6. **Test order tracking** - monitor pesanan aktif

### **Untuk Development:**
1. **Check routes** di `App.js` untuk waiter access
2. **Verify services** - tableService, kitchenService
3. **Test API endpoints** - pastikan semua working
4. **Check permissions** - waiter role access












































































