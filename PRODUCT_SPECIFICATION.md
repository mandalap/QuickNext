# QuickKasir - Product Specification Document

## 1. Product Overview

**Product Name:** QuickKasir - Kasir POS System  
**Version:** 2.0  
**Type:** Multi-Outlet Point of Sale (POS) System  
**Target Users:** Restaurants, Retail Stores, Multi-outlet Businesses

## 2. Product Purpose

QuickKasir adalah sistem POS (Point of Sale) lengkap yang dirancang untuk membantu bisnis mengelola operasional harian, penjualan, inventori, dan laporan keuangan. Sistem ini mendukung multi-business dan multi-outlet dengan role-based access control yang komprehensif.

## 3. Core Features

### 3.1 Authentication & Authorization
- **Login/Logout:** User dapat login dengan email dan password
- **Role-Based Access:** Sistem mendukung 6 role (super_admin, owner, admin, kasir, kitchen, waiter)
- **Multi-Business Support:** User dapat memiliki atau mengakses multiple businesses
- **Multi-Outlet Support:** Setiap business dapat memiliki multiple outlets
- **Outlet Assignment:** Employees dapat di-assign ke outlet tertentu

### 3.2 Dashboard
- **Role-Specific Dashboard:** Setiap role memiliki dashboard yang berbeda
- **Business Overview:** Statistik penjualan, produk terlaris, order terbaru
- **Real-time Updates:** Data update secara real-time
- **Quick Actions:** Shortcut untuk fitur-fitur penting

### 3.3 Point of Sale (POS)
- **Cashier POS:** Interface untuk kasir melakukan transaksi
- **Product Selection:** Pilih produk dari katalog dengan search dan filter
- **Barcode Scanning:** Scan barcode untuk menambah produk ke cart
- **Cart Management:** Tambah, kurangi, hapus item dari cart
- **Hold/Recall Orders:** Tahan order sementara dan recall kembali
- **Customer Selection:** Pilih customer dari database atau walk-in
- **Payment Processing:** 
  - Multiple payment methods (Cash, Card, QRIS, Transfer)
  - Calculate change automatically
  - Process payment via API
- **Receipt Printing:** Generate dan print receipt setelah pembayaran

### 3.4 Product Management
- **Product CRUD:** Create, Read, Update, Delete produk
- **Category Management:** Kelola kategori produk
- **Product Variants:** Support untuk produk dengan variant (size, color, dll)
- **Stock Management:** Track stock per outlet
- **Product Search:** Search produk by name, SKU, barcode
- **Image Upload:** Upload gambar produk

### 3.5 Order Management
- **Order List:** Lihat semua order dengan filter dan search
- **Order Details:** Detail lengkap order termasuk items dan payment
- **Order Status:** Track status order (pending, processing, completed, cancelled)
- **Payment Status:** Track payment status (pending, paid, failed, refunded)
- **Order Editing:** Edit order sebelum payment (jika diizinkan)
- **Order Cancellation:** Cancel order dengan refund handling

### 3.6 Inventory Management
- **Stock Tracking:** Real-time stock tracking per outlet
- **Stock Movements:** History pergerakan stock (in, out, adjustment)
- **Low Stock Alerts:** Notifikasi ketika stock rendah
- **Stock Adjustment:** Manual adjustment stock
- **Ingredient Management:** Kelola bahan baku untuk recipe
- **Recipe Management:** Setup recipe untuk produk yang memerlukan bahan baku

### 3.7 Employee Management
- **Employee CRUD:** Create, Read, Update, Delete employee
- **Role Assignment:** Assign role ke employee
- **Outlet Assignment:** Assign employee ke outlet tertentu
- **Attendance System:** 
  - Clock in/out dengan GPS validation
  - Shift management (Pagi, Siang, Malam)
  - Late tracking dengan tolerance 15 menit
  - Attendance reports
- **Performance Tracking:** Track performance employee

### 3.8 Financial Management
- **Cash Flow Tracking:** Track cash flow harian
- **Tax Management:** CRUD untuk pajak dengan status (pending, paid, overdue, cancelled)
- **Expense Tracking:** Track pengeluaran
- **Financial Reports:** Laporan keuangan lengkap
- **Cash Balance:** Calculate cash balance termasuk paid taxes

### 3.9 Reporting
- **Sales Reports:** 
  - Sales summary
  - Sales detail
  - Sales chart dengan berbagai visualisasi
  - Payment type analysis
- **Product Reports:**
  - Product sales
  - Category sales
- **Promo Reports:**
  - Promo usage analytics
  - Discount effectiveness
- **Cashier Reports:**
  - Cashier performance
  - Cashier closing
- **Customer Reports:**
  - Customer analysis
- **Inventory Reports:**
  - Inventory status
  - Stock movements
- **Tax Reports:** Laporan pajak dengan grafik
- **Attendance Reports:** Laporan absensi dengan grafik
- **Export:** Export reports ke Excel atau PDF

### 3.10 WhatsApp Integration
- **Per-Outlet Configuration:** Setiap outlet dapat memiliki API key sendiri
- **Automatic Notifications:** Kirim notifikasi otomatis setelah pembayaran
- **Custom Messages:** Template pesan yang dapat di-customize
- **Test Functionality:** Test koneksi WhatsApp
- **Multiple Providers:** Support untuk Wablitz, Fonnte, Wablas, dll

### 3.11 Kitchen Management
- **Kitchen Dashboard:** Interface khusus untuk dapur
- **Order Queue:** Daftar order yang perlu diproses
- **Order Status Update:** Update status order (pending, cooking, ready)
- **Notifications:** Notifikasi order baru

### 3.12 Waiter Management
- **Waiter Dashboard:** Interface untuk waiter
- **Table Management:** Kelola status meja (available, occupied, reserved)
- **Order Taking:** Waiter dapat membuat order via POS
- **Order Tracking:** Track status order untuk delivery

## 4. User Roles & Permissions

### Super Admin
- Access semua businesses dan outlets
- Create businesses
- Assign owners
- Platform-wide statistics

### Owner
- Access business(es) yang dimiliki
- Access semua outlets dalam business
- Manage outlets
- Assign managers
- View all data

### Admin
- Access business dan outlet yang di-assign
- Manage products, inventory, employees
- View reports
- Manage settings

### Kasir
- Access outlet yang di-assign
- Use POS untuk transaksi
- View sales reports
- Clock in/out untuk attendance

### Kitchen
- Access outlet yang di-assign
- View kitchen dashboard
- Update order status
- Clock in/out untuk attendance

### Waiter
- Access outlet yang di-assign
- View waiter dashboard
- Manage tables
- Create orders via POS
- Clock in/out untuk attendance

## 5. Technical Requirements

### Frontend
- React 19.0.0
- React Router DOM 7.5.1
- TanStack Query untuk state management
- Tailwind CSS untuk styling
- Radix UI untuk components
- Axios untuk API calls

### Backend
- Laravel 12.0
- PHP 8.2+
- Laravel Sanctum untuk authentication
- MySQL/PostgreSQL untuk database
- Midtrans untuk payment gateway

### Development Environment
- Frontend runs on port 3000
- Backend runs on port 8000
- API base URL: http://localhost:8000/api/v1

## 6. Key User Flows

### 6.1 Login Flow
1. User mengakses aplikasi
2. Input email dan password
3. System validate credentials
4. System check subscription status
5. System check role dan outlet assignment
6. Redirect ke dashboard sesuai role

### 6.2 POS Transaction Flow
1. Kasir login dan access POS
2. System load products dari outlet
3. Kasir pilih produk atau scan barcode
4. Produk ditambahkan ke cart
5. (Optional) Kasir pilih customer
6. Kasir klik "Proses Pembayaran"
7. Kasir pilih metode pembayaran
8. Kasir input amount paid
9. System calculate change
10. Kasir klik "Bayar Sekarang"
11. System create order via API
12. System update stock
13. System kirim WhatsApp notification (jika enabled)
14. System generate receipt
15. Kasir print receipt

### 6.3 Product Management Flow
1. Admin login
2. Navigate ke Product Management
3. View list products dengan filter dan search
4. Create/Edit/Delete product
5. Upload product image
6. Set stock per outlet
7. Save changes

### 6.4 Attendance Flow
1. Employee login
2. Navigate ke Attendance page
3. System detect GPS location
4. Employee pilih shift (Pagi/Siang/Malam atau custom)
5. Employee klik "Clock In"
6. System validate GPS location (dalam radius outlet)
7. System create attendance record
8. Employee dapat view attendance history
9. Employee klik "Clock Out" di akhir shift
10. System calculate working hours dan overtime

### 6.5 Report Generation Flow
1. User login (role yang memiliki akses reports)
2. Navigate ke Reports page
3. Pilih jenis report
4. Set date range filter
5. System fetch data dari API
6. System display data dalam tabel dan grafik
7. User dapat export ke Excel atau PDF

## 7. Success Criteria

### Functional Requirements
- ✅ User dapat login dengan credentials yang valid
- ✅ User dapat access features sesuai role
- ✅ Kasir dapat melakukan transaksi via POS
- ✅ System dapat process payment dengan berbagai metode
- ✅ System dapat generate receipt
- ✅ System dapat track stock secara real-time
- ✅ System dapat generate reports dengan akurat
- ✅ Employee dapat clock in/out dengan GPS validation
- ✅ System dapat kirim WhatsApp notification

### Performance Requirements
- Page load time < 3 seconds
- API response time < 1 second
- Real-time updates tanpa delay yang signifikan
- Support untuk 100+ concurrent users

### Security Requirements
- Authentication required untuk semua protected routes
- Role-based authorization untuk semua features
- API keys encrypted di database
- GPS validation untuk attendance
- Input validation untuk semua forms

## 8. Test Scenarios

### Critical Paths to Test
1. **Authentication:** Login, Logout, Session management
2. **POS Transaction:** Complete transaction flow dari product selection sampai receipt
3. **Product Management:** CRUD operations untuk products
4. **Order Management:** View, edit, cancel orders
5. **Inventory:** Stock tracking dan adjustments
6. **Reports:** Generate berbagai jenis reports
7. **Attendance:** Clock in/out dengan GPS validation
8. **Financial:** Tax management dan cash balance calculation
9. **WhatsApp:** Send notification setelah payment

### Test Accounts
- Admin: `admin@test.com` / `password123`
- Kasir: `kasir1@gmail.com` / `password123`
- Waiter: `waiter@test.com` / `password123`
- Super Admin: `superadmin@test.com` / `password123`

## 9. Future Enhancements

- Self-service kiosk untuk pelanggan
- Integration dengan online platforms (GoFood, GrabFood, ShopeeFood)
- Mobile app untuk employees
- Advanced analytics dengan AI/ML
- Multi-currency support
- Multi-language support

