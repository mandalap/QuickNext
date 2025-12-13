# Laundry Business Setup Guide

## 📋 Overview

Panduan setup kategori dan produk/layanan untuk bisnis laundry di sistem POS fleksibel ini.

## 🏷️ Kategori Laundry

### Kategori Utama

#### 1. Cuci (Washing)

- Cuci Regular
- Cuci Express (24 jam)
- Cuci Kilat (12 jam)

#### 2. Setrika (Ironing)

- Setrika Regular
- Setrika Express

#### 3. Cuci + Setrika (Wash & Iron)

- Cuci + Setrika Regular
- Cuci + Setrika Express

#### 4. Dry Clean

- Dry Clean Baju
- Dry Clean Jas
- Dry Clean Bahan Khusus

#### 5. Layanan Khusus

- Cuci Karpet
- Cuci Gorden
- Cuci Sofa/Cover
- Cuci Sepatu
- Cuci Tas

#### 6. Paket (Package)

- Paket Reguler (3 kg)
- Paket Express (2 kg)
- Paket Bulanan

## 📦 Produk/Layanan Laundry

### Struktur Product untuk Laundry

Karena laundry menggunakan **services** bukan **products**, kita bisa menggunakan Product model dengan konfigurasi khusus:

```javascript
// Product sebagai Service untuk Laundry
{
  name: "Cuci Regular",
  category_id: 1, // Cuci
  type: "service", // atau bisa dihandle via category
  price: 5000, // Harga per kg atau per item
  pricing_model: "per_kg", // per_kg, per_item, package
  unit: "kg", // atau "item"
  description: "Cuci regular dengan estimasi siap 2-3 hari",
  is_active: true,
  stock: null, // Tidak ada stock untuk service
  requires_stock: false
}
```

### Contoh Produk/Layanan

#### Kategori: Cuci

```json
[
  {
    "name": "Cuci Regular",
    "price": 5000,
    "pricing_model": "per_kg",
    "unit": "kg",
    "description": "Cuci regular dengan estimasi siap 2-3 hari",
    "duration": "2-3 hari"
  },
  {
    "name": "Cuci Express",
    "price": 8000,
    "pricing_model": "per_kg",
    "unit": "kg",
    "description": "Cuci express dengan estimasi siap 24 jam",
    "duration": "24 jam",
    "is_express": true
  },
  {
    "name": "Cuci Kilat",
    "price": 12000,
    "pricing_model": "per_kg",
    "unit": "kg",
    "description": "Cuci kilat dengan estimasi siap 12 jam",
    "duration": "12 jam",
    "is_express": true
  }
]
```

#### Kategori: Setrika

```json
[
  {
    "name": "Setrika Regular",
    "price": 4000,
    "pricing_model": "per_kg",
    "unit": "kg",
    "description": "Setrika regular",
    "duration": "1 hari"
  },
  {
    "name": "Setrika Express",
    "price": 6000,
    "pricing_model": "per_kg",
    "unit": "kg",
    "description": "Setrika express",
    "duration": "6 jam",
    "is_express": true
  }
]
```

#### Kategori: Cuci + Setrika

```json
[
  {
    "name": "Cuci + Setrika Regular",
    "price": 8000,
    "pricing_model": "per_kg",
    "unit": "kg",
    "description": "Cuci dan setrika regular",
    "duration": "2-3 hari"
  },
  {
    "name": "Cuci + Setrika Express",
    "price": 12000,
    "pricing_model": "per_kg",
    "unit": "kg",
    "description": "Cuci dan setrika express",
    "duration": "24 jam",
    "is_express": true
  }
]
```

#### Kategori: Dry Clean

```json
[
  {
    "name": "Dry Clean Baju",
    "price": 15000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Dry clean untuk baju",
    "duration": "3-4 hari"
  },
  {
    "name": "Dry Clean Jas",
    "price": 25000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Dry clean untuk jas",
    "duration": "3-4 hari"
  },
  {
    "name": "Dry Clean Bahan Khusus",
    "price": 20000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Dry clean untuk bahan sutra, wool, dll",
    "duration": "4-5 hari"
  }
]
```

#### Kategori: Layanan Khusus

```json
[
  {
    "name": "Cuci Karpet",
    "price": 50000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Cuci karpet ukuran standar",
    "duration": "3-4 hari"
  },
  {
    "name": "Cuci Gorden",
    "price": 30000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Cuci gorden per lembar",
    "duration": "2-3 hari"
  },
  {
    "name": "Cuci Sofa Cover",
    "price": 40000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Cuci cover sofa",
    "duration": "2-3 hari"
  },
  {
    "name": "Cuci Sepatu",
    "price": 20000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Cuci sepatu",
    "duration": "2-3 hari"
  },
  {
    "name": "Cuci Tas",
    "price": 25000,
    "pricing_model": "per_item",
    "unit": "item",
    "description": "Cuci tas",
    "duration": "2-3 hari"
  }
]
```

#### Kategori: Paket

```json
[
  {
    "name": "Paket Reguler 3 kg",
    "price": 15000,
    "pricing_model": "package",
    "unit": "package",
    "description": "Paket cuci + setrika 3 kg",
    "duration": "2-3 hari",
    "package_weight": 3
  },
  {
    "name": "Paket Express 2 kg",
    "price": 18000,
    "pricing_model": "package",
    "unit": "package",
    "description": "Paket cuci + setrika express 2 kg",
    "duration": "24 jam",
    "package_weight": 2,
    "is_express": true
  },
  {
    "name": "Paket Bulanan",
    "price": 200000,
    "pricing_model": "package",
    "unit": "month",
    "description": "Paket bulanan unlimited cuci + setrika",
    "duration": "30 hari",
    "package_type": "monthly"
  }
]
```

## 🗄️ Database Structure untuk Laundry

### Categories Table

```sql
INSERT INTO categories (business_id, name, description, is_active, sort_order) VALUES
(1, 'Cuci', 'Layanan cuci pakaian', true, 1),
(1, 'Setrika', 'Layanan setrika pakaian', true, 2),
(1, 'Cuci + Setrika', 'Layanan cuci dan setrika', true, 3),
(1, 'Dry Clean', 'Layanan dry cleaning', true, 4),
(1, 'Layanan Khusus', 'Layanan khusus seperti karpet, gorden, dll', true, 5),
(1, 'Paket', 'Paket layanan laundry', true, 6);
```

### Products Table (Service untuk Laundry)

```sql
-- Contoh: Product sebagai Service
-- Field khusus untuk laundry:
- type: 'service' (bisa ditambahkan field ini)
- pricing_model: 'per_kg', 'per_item', 'package'
- unit: 'kg', 'item', 'package'
- duration: Estimasi waktu siap (dalam settings JSON)
- is_express: boolean (untuk layanan express)
- package_weight: integer (untuk package pricing)
```

## 📝 Order Fields untuk Laundry

Berdasarkan konfigurasi BusinessType untuk laundry, order fields yang tersedia:

```javascript
{
  "order_fields": [
    "weight",        // Berat laundry (kg)
    "item_type",     // Jenis item: pakaian, karpet, gorden, dll
    "special_notes", // Catatan khusus: stain removal, delicate, dll
    "pickup_date"    // Estimasi tanggal siap
  ]
}
```

### Contoh Penggunaan di Order

```javascript
// Saat membuat order laundry
{
  order_items: [
    {
      product_id: 1, // "Cuci Regular"
      quantity: 3,   // 3 kg
      price: 5000,
      subtotal: 15000
    }
  ],
  // Custom fields untuk laundry
  order_fields: {
    weight: 3,                              // 3 kg
    item_type: "pakaian",                   // Jenis item
    special_notes: "Ada noda di baju putih, perlu perlakuan khusus",
    pickup_date: "2025-11-05"               // Estimasi siap
  }
}
```

## 🎯 Pricing Models untuk Laundry

### 1. Per Kg (Per Kilo)

- Cuci Regular: Rp 5.000/kg
- Cuci Express: Rp 8.000/kg
- Setrika: Rp 4.000/kg
- Cuci + Setrika: Rp 8.000/kg

### 2. Per Item (Per Item)

- Dry Clean Baju: Rp 15.000/item
- Dry Clean Jas: Rp 25.000/item
- Cuci Sepatu: Rp 20.000/item
- Cuci Tas: Rp 25.000/item

### 3. Package (Paket)

- Paket Reguler 3 kg: Rp 15.000/package
- Paket Express 2 kg: Rp 18.000/package
- Paket Bulanan: Rp 200.000/month

## 💡 Tips Setup Laundry

### 1. Kategori Setup

- Buat kategori berdasarkan jenis layanan utama
- Group layanan yang serupa dalam kategori yang sama
- Gunakan deskripsi yang jelas untuk setiap kategori

### 2. Produk/Layanan Setup

- **Name**: Gunakan nama yang jelas dan mudah dipahami customer
- **Price**: Sesuaikan dengan pricing model (per_kg, per_item, package)
- **Unit**: Pastikan unit sesuai dengan pricing model
- **Description**: Sertakan estimasi waktu siap
- **Stock**: Set ke `null` atau `0` karena ini service, bukan product fisik

### 3. Pricing Strategy

- Regular: Harga standar, estimasi 2-3 hari
- Express: Harga premium, estimasi 24 jam atau lebih cepat
- Package: Harga bundle untuk customer loyal

### 4. Order Management

- Track weight untuk setiap order
- Tambahkan item_type untuk membedakan jenis laundry
- Gunakan special_notes untuk instruksi khusus
- Set pickup_date untuk customer reference

## 🚀 Quick Start

### Step 1: Setup Categories

Buat 6 kategori utama seperti yang disebutkan di atas

### Step 2: Setup Products/Services

Buat produk/layanan untuk setiap kategori dengan pricing yang sesuai

### Step 3: Configure Order Fields

Pastikan order form mengcapture:

- Weight (kg)
- Item type
- Special notes
- Pickup date

### Step 4: Setup Order Status Flow

Gunakan status flow khusus laundry:

1. `received` - Pesanan diterima
2. `washing` - Sedang dicuci
3. `ironing` - Sedang disetrika
4. `ready` - Sudah siap diambil
5. `completed` - Customer sudah mengambil
6. `picked_up` - Konfirmasi sudah diambil

## 📊 Contoh Order Laundry

```
Order #LAU001
Customer: Bapak Budi
Phone: 081234567890

Items:
- Cuci Regular (3 kg) x 1 = Rp 15.000
- Setrika (2 kg) x 1 = Rp 8.000
Total: Rp 23.000

Order Details:
- Weight: 5 kg
- Item Type: Pakaian
- Special Notes: Ada noda di kaos putih
- Pickup Date: 2025-11-05
- Status: received
```

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-01  
**Author:** System Developer
