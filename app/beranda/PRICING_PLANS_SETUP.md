# Setup Pricing Plans dari Database

## Overview
Pricing plans di landing page sekarang terhubung dengan database, sehingga lebih fleksibel dan bisa diubah tanpa perlu edit code.

## Setup

### 1. Jalankan Migration
Tambahkan field `is_popular` dan `cta_text` ke tabel `subscription_plans`:

```bash
cd app/backend
php artisan migrate
```

### 2. Update Seeder (Opsional)
Jika ingin update data existing, jalankan seeder:

```bash
php artisan db:seed --class=SubscriptionPlanSeeder
```

Atau update manual via database:
- Set `is_popular = true` untuk plan yang ingin ditandai sebagai "Paling Populer"
- Set `cta_text` sesuai kebutuhan (default: "Mulai Sekarang", "Paling Populer", "Hubungi Kami")

### 3. Konfigurasi API URL
Pastikan environment variable `NEXT_PUBLIC_API_URL` di file `.env` beranda sudah benar:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Atau untuk production:
```env
NEXT_PUBLIC_API_URL=https://api.quickkasir.com
```

## Struktur Data

### SubscriptionPlan Model
- `name`: Nama paket (Basic, Professional, Enterprise)
- `slug`: URL-friendly identifier
- `description`: Deskripsi paket
- `features`: Array/JSON fitur-fitur paket
- `is_popular`: Boolean, true untuk paket populer
- `cta_text`: Text untuk tombol CTA (default: "Mulai Sekarang")
- `is_active`: Boolean, hanya paket aktif yang ditampilkan
- `sort_order`: Urutan tampilan

### SubscriptionPlanPrice Model
- `duration_type`: monthly, quarterly, semi_annual, annual
- `duration_months`: 1, 3, 6, 12
- `price`: Harga asli
- `discount_percentage`: Persentase diskon
- `final_price`: Harga setelah diskon

## API Endpoint

### Get All Plans (Public)
```
GET /api/subscriptions/plans
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Basic",
      "slug": "basic",
      "description": "...",
      "is_popular": false,
      "cta_text": "Mulai Sekarang",
      "features": [...],
      "prices": [
        {
          "duration_type": "monthly",
          "duration_months": 1,
          "final_price": 99000
        }
      ]
    }
  ]
}
```

## Cara Mengubah Pricing Plans

### Via Database
1. Login ke database
2. Update tabel `subscription_plans`:
   - Ubah harga: Update `subscription_plan_prices.final_price`
   - Ubah fitur: Update `subscription_plans.features` (JSON)
   - Tandai popular: Set `is_popular = true`
   - Ubah CTA text: Update `cta_text`

### Via Admin Panel (Future)
Admin panel untuk manage pricing plans akan ditambahkan di update berikutnya.

## Fallback
Jika API gagal atau tidak tersedia, landing page akan menggunakan data default hardcoded sebagai fallback.

## Testing

1. Pastikan backend API running di `http://localhost:8000`
2. Test endpoint: `curl http://localhost:8000/api/subscriptions/plans`
3. Refresh landing page, pricing plans harus ter-load dari API
4. Cek browser console untuk error jika ada


