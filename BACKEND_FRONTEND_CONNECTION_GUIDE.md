# 🔗 Panduan Koneksi Backend-Frontend - Kasir POS System

## 📋 Status Koneksi

✅ **Backend Laravel**: Berjalan di `http://localhost:8000`  
✅ **Frontend React**: Berjalan di `http://localhost:3000`  
✅ **API Configuration**: Sudah dikonfigurasi dengan benar  
✅ **CORS**: Sudah dikonfigurasi untuk localhost

## 🚀 Cara Menjalankan Sistem

### 1. Menjalankan Backend Laravel

```bash
# Buka terminal dan masuk ke folder backend
cd app/backend

# Install dependencies (jika belum)
composer install

# Jalankan server Laravel
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. Menjalankan Frontend React

```bash
# Buka terminal baru dan masuk ke folder frontend
cd app/frontend

# Install dependencies (jika belum)
npm install

# Jalankan development server
npm start
```

## 🔧 Konfigurasi API

### File Environment Frontend

File: `app/frontend/.env.local`

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_ENV=development
REACT_APP_DEBUG=true
```

### File Environment Backend

File: `app/backend/.env`

```env
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

## 📊 API Endpoints Dashboard

### 1. Dashboard Stats

- **URL**: `GET /api/v1/dashboard/stats`
- **Headers**:
  - `Authorization: Bearer {token}`
  - `X-Business-Id: {business_id}`
  - `X-Outlet-Id: {outlet_id}` (opsional)
- **Response**: Statistik penjualan, transaksi, produk, dll.

### 2. Recent Orders

- **URL**: `GET /api/v1/dashboard/recent-orders`
- **Headers**: Sama seperti stats
- **Response**: 10 pesanan terbaru

### 3. Top Products

- **URL**: `GET /api/v1/dashboard/top-products`
- **Headers**: Sama seperti stats
- **Response**: 10 produk terlaris

## 🔐 Autentikasi

### Login Flow

1. User login melalui `/api/login`
2. Backend mengembalikan token
3. Frontend menyimpan token di localStorage
4. Setiap request API menyertakan token di header Authorization

### Headers yang Diperlukan

```javascript
{
  'Authorization': 'Bearer {token}',
  'X-Business-Id': '{business_id}',
  'X-Outlet-Id': '{outlet_id}', // untuk role kasir/kitchen/waiter
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}
```

## 🛠️ Troubleshooting

### Masalah Umum

#### 1. CORS Error

**Gejala**: Error "Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy"

**Solusi**:

- Pastikan file `app/backend/config/cors.php` sudah dikonfigurasi dengan benar
- Restart server Laravel

#### 2. 401 Unauthorized

**Gejala**: Semua request API mengembalikan status 401

**Solusi**:

- Pastikan user sudah login
- Cek token di localStorage
- Pastikan token belum expired

#### 3. 404 Not Found

**Gejala**: API endpoint tidak ditemukan

**Solusi**:

- Pastikan route sudah terdaftar di `app/backend/routes/api.php`
- Cek URL endpoint di frontend
- Pastikan server Laravel berjalan

#### 4. Network Error

**Gejala**: "Network request failed" atau "Failed to fetch"

**Solusi**:

- Pastikan backend Laravel berjalan di port 8000
- Cek firewall/antivirus
- Restart kedua server

### Test Koneksi

Buka file `test_backend_connection.html` di browser untuk test koneksi secara otomatis.

## 📁 Struktur File Penting

### Frontend

```
app/frontend/
├── src/
│   ├── config/api.config.js          # Konfigurasi API endpoints
│   ├── utils/apiClient.js            # HTTP client dengan interceptors
│   ├── services/dashboard.service.js # Service untuk dashboard API
│   └── components/dashboards/
│       └── Dashboard.jsx             # Komponen dashboard utama
├── .env.local                        # Environment variables
└── package.json                      # Dependencies
```

### Backend

```
app/backend/
├── app/Http/Controllers/Api/
│   └── DashboardController.php       # Controller untuk dashboard API
├── routes/api.php                    # API routes
├── config/cors.php                   # CORS configuration
└── .env                              # Environment variables
```

## 🔄 Flow Data Dashboard

1. **User Login** → Token disimpan di localStorage
2. **Pilih Business/Outlet** → ID disimpan di localStorage
3. **Load Dashboard** → Frontend memanggil API dashboard
4. **API Request** → Dengan headers Authorization, X-Business-Id, X-Outlet-Id
5. **Backend Response** → Data statistik, recent orders, top products
6. **Frontend Render** → Menampilkan data di dashboard

## 📈 Monitoring

### Console Logs

Frontend akan menampilkan log di console browser:

- `🔗 API BASE_URL: http://localhost:8000/api`
- `📤 Request: GET /v1/dashboard/stats`
- `✅ Response: 200 /v1/dashboard/stats`

### Network Tab

Cek Network tab di Developer Tools untuk melihat:

- Request/Response headers
- Response data
- Status codes
- Timing

## 🎯 Next Steps

1. **Test Login Flow**: Pastikan user bisa login dan mendapat token
2. **Test Dashboard Data**: Verifikasi data dashboard muncul dengan benar
3. **Test Real-time Updates**: Implementasi auto-refresh dashboard
4. **Error Handling**: Tambahkan error handling yang lebih baik
5. **Loading States**: Implementasi loading indicators

## 📞 Support

Jika ada masalah dengan koneksi backend-frontend:

1. Cek console browser untuk error detail
2. Cek Network tab untuk request/response
3. Test dengan file `test_backend_connection.html`
4. Restart kedua server
5. Cek file environment configuration

---

**Status**: ✅ Koneksi Backend-Frontend Berhasil Dikonfigurasi  
**Terakhir Update**: 18 Oktober 2025  
**Versi**: 1.0.0
