# QuickKasir - Multi-Outlet POS System

[![Version](https://img.shields.io/badge/version-2.0-blue.svg)](https://github.com/mandalap/QuickNext)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**QuickKasir** adalah sistem Point of Sale (POS) lengkap yang dirancang untuk membantu bisnis mengelola operasional harian, penjualan, inventori, dan laporan keuangan. Sistem ini mendukung multi-business dan multi-outlet dengan role-based access control yang komprehensif.

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Proyek](#-struktur-proyek)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Penggunaan](#-penggunaan)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)

## ✨ Fitur Utama

### 🔐 Authentication & Authorization
- Login/Logout dengan email dan password
- Role-Based Access Control (6 roles: super_admin, owner, admin, kasir, kitchen, waiter)
- Multi-Business Support
- Multi-Outlet Support
- Outlet Assignment untuk employees

### 💰 Point of Sale (POS)
- **Cashier POS**: Interface lengkap untuk kasir melakukan transaksi
- **Product Selection**: Pilih produk dari katalog dengan search dan filter
- **Barcode Scanning**: Scan barcode untuk menambah produk ke cart
- **Cart Management**: Tambah, kurangi, hapus item dari cart
- **Hold/Recall Orders**: Tahan order sementara dan recall kembali
- **Customer Selection**: Pilih customer dari database atau walk-in
- **Payment Processing**: 
  - Multiple payment methods (Cash, Card, QRIS, Transfer)
  - Auto-calculate change
  - Process payment via API
- **Receipt Printing**: Generate dan print receipt setelah pembayaran

### 📦 Product Management
- Product CRUD (Create, Read, Update, Delete)
- Category Management
- Product Variants support
- Stock Management per outlet
- Product Search (by name, SKU, barcode)
- Image Upload untuk produk

### 📊 Dashboard
- Role-Specific Dashboard untuk setiap role
- Business Overview dengan statistik penjualan
- Real-time Updates
- Quick Actions untuk fitur-fitur penting

### 📈 Reporting
- Sales Reports dengan berbagai visualisasi
- Product Reports
- Promo Reports
- Cashier Reports
- Customer Reports
- Financial Reports

### 👥 Employee Management
- Employee CRUD
- Role Assignment
- Outlet Assignment
- Attendance System dengan GPS validation
- Shift Management
- Performance Tracking

### 💼 Financial Management
- Cash Flow Tracking
- Tax Management
- Expense Tracking
- Financial Reports
- Cash Balance Calculation

### 🏪 Inventory Management
- Real-time Stock Tracking per outlet
- Stock Movements History
- Low Stock Alerts
- Stock Adjustment
- Ingredient Management
- Recipe Management

## 🛠 Teknologi yang Digunakan

### Frontend
- **React 19** - UI Framework
- **React Router DOM** - Routing
- **Axios** - HTTP Client
- **Tailwind CSS** - Styling
- **Radix UI** - UI Components
- **Zustand** - State Management
- **React Query** - Data Fetching & Caching
- **Recharts** - Data Visualization

### Backend
- **Laravel 11** - PHP Framework
- **MySQL** - Database
- **Laravel Sanctum** - Authentication
- **Midtrans** - Payment Gateway Integration

### Landing Page
- **Next.js 14** - React Framework untuk landing page

## 📁 Struktur Proyek

```
kasir-pos-system/
├── app/
│   ├── backend/          # Laravel Backend API
│   │   ├── app/
│   │   ├── config/
│   │   ├── database/
│   │   ├── routes/
│   │   └── public/
│   ├── frontend/         # React Frontend Application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── contexts/
│   │   │   └── utils/
│   │   └── public/
│   └── beranda/          # Next.js Landing Page
│       ├── app/
│       └── components/
├── testsprite_tests/     # Automated test files
└── README.md            # This file
```

## 📋 Persyaratan Sistem

### Backend
- PHP >= 8.2
- Composer
- MySQL >= 8.0
- Node.js >= 18.x (untuk asset compilation)

### Frontend
- Node.js >= 18.x
- npm atau yarn

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/mandalap/QuickNext.git
cd QuickNext
```

### 2. Backend Setup

```bash
cd app/backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# Seed database (optional)
php artisan db:seed

# Start development server
php artisan serve
```

Backend akan berjalan di `http://localhost:8000`

### 3. Frontend Setup

```bash
cd app/frontend

# Install dependencies
npm install
# atau
yarn install

# Start development server
npm start
# atau
yarn start
```

Frontend akan berjalan di `http://localhost:3000`

### 4. Landing Page Setup (Optional)

```bash
cd app/beranda

# Install dependencies
npm install
# atau
yarn install

# Start development server
npm run dev
# atau
yarn dev
```

Landing page akan berjalan di `http://localhost:3001`

## ⚙️ Konfigurasi

### Environment Variables

Comprehensive environment variables guide tersedia di `ENVIRONMENT_VARIABLES_GUIDE.md`.

#### Quick Setup

**Backend (.env):**
Lihat template di `app/backend/ENV_TEMPLATE.md` atau `ENVIRONMENT_VARIABLES_GUIDE.md`

**Frontend (.env.local):**
Lihat template di `app/frontend/ENV_TEMPLATE.md` atau `ENVIRONMENT_VARIABLES_GUIDE.md`

**Untuk dokumentasi lengkap, lihat:** [`ENVIRONMENT_VARIABLES_GUIDE.md`](./ENVIRONMENT_VARIABLES_GUIDE.md)

## 📖 Penggunaan

### Login

1. Buka aplikasi di browser: `http://localhost:3000`
2. Login dengan email dan password
3. Pilih business (jika memiliki multiple businesses)
4. Pilih outlet (jika memiliki multiple outlets)

### Role-Based Access

- **Super Admin**: Akses penuh ke semua businesses dan outlets
- **Owner**: Akses ke businesses yang dimiliki, semua outlets dalam business
- **Admin**: Akses ke outlet tertentu yang di-assign
- **Kasir**: Akses POS untuk transaksi
- **Kitchen**: Akses kitchen display untuk order management
- **Waiter**: Akses waiter dashboard untuk order management

### POS Transaction

1. Pilih produk dari katalog
2. Tambahkan ke cart
3. Pilih customer (atau walk-in)
4. Proses pembayaran
5. Print receipt

## 📚 API Documentation

Comprehensive API documentation tersedia di `API_DOCUMENTATION.md`.

### Base URL
```
Development: http://localhost:8000/api
Production: https://api.quickkasir.com/api
```

### Authentication
Semua API endpoints (kecuali login/register) memerlukan authentication token:

```http
Authorization: Bearer {token}
```

### Endpoints Utama

- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/v1/businesses` - Get businesses
- `GET /api/v1/products` - Get products
- `POST /api/v1/orders` - Create order
- `GET /api/v1/subscriptions/current` - Get current subscription

**Untuk dokumentasi lengkap, lihat:** [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)

## 🧪 Testing

### Backend Tests

```bash
cd app/backend
php artisan test
```

### Frontend Tests

```bash
cd app/frontend
npm test
```

## 🚢 Deployment

Comprehensive deployment guide tersedia di `DEPLOYMENT_GUIDE.md`.

### Quick Deployment

#### Frontend
```bash
cd app/frontend
npm run build
```

Build files akan tersedia di `app/frontend/build/`

#### Backend
```bash
cd app/backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Production Checklist

- [ ] Set environment variables untuk production
- [ ] Setup SSL/HTTPS certificate
- [ ] Configure database (MySQL/PostgreSQL)
- [ ] Setup Midtrans production credentials
- [ ] Configure CORS untuk production URLs
- [ ] Run database migrations
- [ ] Test semua features

**Untuk deployment guide lengkap, lihat:** [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)

## 🔧 Troubleshooting

### Common Issues

#### 1. CORS Error
Pastikan backend CORS configuration sudah benar di `config/cors.php`. Lihat `SECURITY_GUIDE.md` untuk detail.

#### 2. Database Connection Error
Periksa database credentials di `.env` file. Lihat `ENVIRONMENT_VARIABLES_GUIDE.md` untuk detail.

#### 3. Token Expired
Clear localStorage dan login ulang. Token refresh mechanism tersedia.

#### 4. Subscription Check Timeout
Endpoint subscription sudah dioptimasi dengan caching. Jika masih timeout, periksa:
- Database connection
- Network latency
- Server resources

#### 5. Business Tidak Muncul
Lihat `BISNIS_TIDAK_MUNCUL_FIX.md` untuk solusi.

#### 6. Service Worker Errors
Lihat `ERROR_HANDLING_GUIDE.md` untuk error handling guide.

### Documentation References

- **Error Handling:** [`ERROR_HANDLING_GUIDE.md`](./ERROR_HANDLING_GUIDE.md)
- **Security:** [`SECURITY_GUIDE.md`](./SECURITY_GUIDE.md)
- **Performance:** [`PERFORMANCE_GUIDE.md`](./PERFORMANCE_GUIDE.md)
- **PWA Features:** [`PWA_FEATURES_GUIDE.md`](./PWA_FEATURES_GUIDE.md)
- **Testing:** [`TESTING_GUIDE.md`](./TESTING_GUIDE.md)
- **Browser Compatibility:** [`BROWSER_COMPATIBILITY_GUIDE.md`](./BROWSER_COMPATIBILITY_GUIDE.md)

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan:

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📝 Changelog

### Version 2.0
- ✅ Multi-outlet support
- ✅ Role-based access control
- ✅ Subscription system
- ✅ Payment gateway integration
- ✅ Optimized API endpoints dengan caching
- ✅ Refactored hardcoded URLs ke apiClient

### Version 1.0
- Initial release

## 📄 Lisensi

Proyek ini menggunakan lisensi MIT. Lihat file `LICENSE` untuk detail.

## 📚 Comprehensive Documentation

### **Main Documentation:**
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) - Complete API documentation
- [`ENVIRONMENT_VARIABLES_GUIDE.md`](./ENVIRONMENT_VARIABLES_GUIDE.md) - Environment variables guide
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Deployment guide
- [`DOCUMENTATION_GUIDE.md`](./DOCUMENTATION_GUIDE.md) - Documentation overview

### **Feature Documentation:**
- [`ERROR_HANDLING_GUIDE.md`](./ERROR_HANDLING_GUIDE.md) - Error handling guide
- [`SECURITY_GUIDE.md`](./SECURITY_GUIDE.md) - Security measures
- [`PERFORMANCE_GUIDE.md`](./PERFORMANCE_GUIDE.md) - Performance optimizations
- [`PWA_FEATURES_GUIDE.md`](./PWA_FEATURES_GUIDE.md) - PWA features
- [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) - Testing guide
- [`BROWSER_COMPATIBILITY_GUIDE.md`](./BROWSER_COMPATIBILITY_GUIDE.md) - Browser compatibility

### **Setup Guides:**
- [`PWA_INSTALL_MOBILE_GUIDE.md`](./app/frontend/PWA_INSTALL_MOBILE_GUIDE.md) - PWA mobile installation
- [`PWA_INSTALL_LOCAL_IP_GUIDE.md`](./app/frontend/PWA_INSTALL_LOCAL_IP_GUIDE.md) - PWA local IP setup
- [`MANUAL_TESTING_GUIDE.md`](./MANUAL_TESTING_GUIDE.md) - Manual testing guide

## 📞 Support

Untuk pertanyaan atau support, silakan:
- Buat issue di GitHub
- Email: support@quickkasir.com
- Lihat dokumentasi lengkap di file-file di atas

## 🙏 Acknowledgments

- Laravel Community
- React Community
- Semua kontributor proyek ini

---

**Dibuat dengan ❤️ oleh Tim QuickKasir**

