# Role-Based Dashboard System - Visual Guide

**Tanggal:** 2025-10-10

---

## 🎨 Dashboard Previews by Role

### 1. Owner/Admin Dashboard (`/`)

**Color Theme:** Blue Gradient

```
┌─────────────────────────────────────────────────────────────┐
│ 🌟 Selamat Datang di Dashboard                             │
│ Kelola bisnis Anda dengan mudah dan efisien                │
│ 📅 Minggu, 10 Oktober 2025  🕐 14:30 WIB                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 💵 Total     │ 🛒 Jumlah    │ 👥 Pelanggan │ 📦 Produk    │
│ Penjualan    │ Transaksi    │ Aktif        │ Terjual      │
│ Rp 2.450.000 │ 147          │ 89           │ 234          │
│ +12.5% ↑     │ +8.2% ↑      │ +5.7% ↑      │ -2.1% ↓      │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────┬─────────────────────────┐
│ 📋 Pesanan Terbaru      │ ⭐ Produk Terlaris      │
├─────────────────────────┼─────────────────────────┤
│ 👤 Ahmad Wijaya         │ 1️⃣ Nasi Goreng Spesial  │
│    ORD-001 • 10:30      │    23 terjual ↑         │
│    Rp 125.000 ✅        │    Rp 345.000           │
│                         │                         │
│ 👤 Siti Nurhaliza       │ 2️⃣ Ayam Bakar           │
│    ORD-002 • 10:25      │    18 terjual ↑         │
│    Rp 89.000 🔄         │    Rp 270.000           │
│                         │                         │
│ 👤 Budi Santoso         │ 3️⃣ Es Teh Manis         │
│    ORD-003 • 10:20      │    45 terjual ↓         │
│    Rp 156.000 ✅        │    Rp 135.000           │
└─────────────────────────┴─────────────────────────┘

┌───────────────────────────────────────────────────┐
│ ⚡ Aksi Cepat                                     │
├─────┬─────┬─────┬─────┬─────┬─────┐             │
│ 💵  │ 📦  │ 📊  │ ⚠️  │ 👥  │ 🎁  │             │
│Kasir│Prod │Lap  │Stok │Karya│Promo│             │
└─────┴─────┴─────┴─────┴─────┴─────┘             │
```

**Features:**
- Full business analytics
- All statistics visible
- Access to all features
- Quick action buttons

---

### 2. Kasir Dashboard (`/cashier`)

**Color Theme:** Blue

```
┌─────────────────────────────────────────────────────────────┐
│ 💼 Dashboard Kasir                                          │
│ Kelola transaksi dengan cepat dan mudah                     │
│ 🕐 14:30 WIB • Minggu, 10 Oktober                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🚀 Mulai Transaksi Baru                                     │
│ Klik tombol di samping untuk membuka kasir                  │
│                                      [💳 Buka Kasir →]      │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│ 🛒 Transaksi │ 💵 Total     │ 📦 Item      │
│ Saya         │ Penjualan    │ Terjual      │
│ 23           │ Rp 1.250.000 │ 67           │
│ Hari ini     │ Hari ini     │ Hari ini     │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📋 Transaksi Terakhir                                       │
├─────────────────────────────────────────────────────────────┤
│ ✅ Walk-in Customer                    Rp 45.000 [Selesai]  │
│    ORD-023 • 2 menit lalu                                   │
│                                                              │
│ ✅ Ahmad Wijaya                        Rp 125.000 [Selesai] │
│    ORD-022 • 8 menit lalu                                   │
│                                                              │
│ ✅ Siti Nurhaliza                      Rp 89.000 [Selesai]  │
│    ORD-021 • 15 menit lalu                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💡 Tips Kasir                                               │
│ ✅ Pastikan jumlah uang sesuai dengan total transaksi      │
│ ✅ Selalu berikan struk kepada pelanggan                   │
│ ✅ Cek stok produk jika ada notifikasi stok menipis        │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Focus on daily transactions
- Quick access to POS
- Personal transaction history
- Cashier tips

---

### 3. Kitchen Dashboard (`/kitchen`)

**Color Theme:** Orange/Red Gradient

```
┌─────────────────────────────────────────────────────────────┐
│ 👨‍🍳 Dashboard Dapur                                          │
│ Kelola pesanan masakan dengan efisien                       │
│ 🕐 14:30 WIB • Minggu, 10 Oktober                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│ ⏳ Pesanan    │ 🔥 Sedang    │ ✅ Selesai   │
│ Menunggu     │ Dimasak      │ Hari Ini     │
│ 3            │ 2            │ 18           │
│ Pesanan      │ Pesanan      │ Pesanan      │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔴 PRIORITAS TINGGI                                         │
│ #025 • Meja 5 • 5 menit yang lalu                          │
├─────────────────────────────────────────────────────────────┤
│ 2️⃣x 🍜 Nasi Goreng Spesial                                 │
│       📝 Pedas level 3                                      │
│ 1️⃣x 🍗 Ayam Bakar                                          │
│ 2️⃣x 🧃 Es Teh Manis                                        │
│       📝 Tanpa es                                           │
├─────────────────────────────────────────────────────────────┤
│                              [🔥 Mulai Masak]               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🟡 NORMAL                                                   │
│ #024 • Meja 12 • 8 menit yang lalu                         │
├─────────────────────────────────────────────────────────────┤
│ 3️⃣x 🍲 Soto Ayam                                           │
│ 1️⃣x 🥗 Gado-gado                                           │
│       📝 Bumbu kacang banyak                               │
├─────────────────────────────────────────────────────────────┤
│                              [✅ Tandai Selesai]            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💡 Tips Dapur                                               │
│ ✅ Prioritaskan pesanan dengan waktu tunggu lebih lama     │
│ ✅ Perhatikan catatan khusus dari pelanggan                │
│ ✅ Update status pesanan secara real-time                  │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Order queue management
- Priority indicators
- Customer notes highlight
- Status updates (pending → cooking → ready)
- Kitchen workflow tips

---

### 4. Waiter Dashboard (`/tables`)

**Color Theme:** Purple/Pink Gradient

```
┌─────────────────────────────────────────────────────────────┐
│ 🍽️ Dashboard Pelayan                                        │
│ Kelola meja dan pesanan pelanggan                          │
│ 🕐 14:30 WIB • Minggu, 10 Oktober                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│ ☕ Meja      │ 📋 Pesanan   │ 💵 Total     │
│ Terisi       │ Aktif        │ Penjualan    │
│ 4/8          │ 7            │ Rp 875.000   │
│ Saat ini     │ Saat ini     │ Saat ini     │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🗺️ Status Meja                                              │
├─────────────┬─────────────┬─────────────┬─────────────┐     │
│ 🔴 Meja 1   │ 🟢 Meja 2   │ 🔴 Meja 3   │ 🟡 Meja 4   │     │
│ [Terisi]    │ [Tersedia]  │ [Terisi]    │ [Reservasi] │     │
│ 👥 4 tamu   │             │ 👥 2 tamu   │ 👥 6 tamu   │     │
│ 💵 250k     │             │ 💵 125k     │ 🕐 18:00    │     │
│ ⏰ 25 menit │             │ ⏰ 15 menit │             │     │
├─────────────┼─────────────┼─────────────┼─────────────┤     │
│ 🔴 Meja 5   │ 🟢 Meja 6   │ 🔴 Meja 7   │ 🟢 Meja 8   │     │
│ [Terisi]    │ [Tersedia]  │ [Terisi]    │ [Tersedia]  │     │
│ 👥 3 tamu   │             │ 👥 5 tamu   │             │     │
│ 💵 180k     │             │ 💵 320k     │             │     │
│ ⏰ 40 menit │             │ ⏰ 10 menit │             │     │
└─────────────┴─────────────┴─────────────┴─────────────┘     │
```

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Pesanan Aktif                                            │
├─────────────────────────────────────────────────────────────┤
│ 🟢 Meja 1                                    [Siap Diantar] │
│    ORD-025 • 3 item • 2 menit lalu                         │
│                                      [✅ Antarkan]          │
├─────────────────────────────────────────────────────────────┤
│ 🔵 Meja 3                                    [Dimasak]      │
│    ORD-024 • 2 item • 5 menit lalu                         │
├─────────────────────────────────────────────────────────────┤
│ 🔵 Meja 5                                    [Dimasak]      │
│    ORD-023 • 4 item • 8 menit lalu                         │
├─────────────────────────────────────────────────────────────┤
│                     [📋 Buat Pesanan Baru]                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💡 Tips Pelayan                                             │
│ ✅ Segera antarkan pesanan yang sudah siap                 │
│ ✅ Cek status meja secara berkala                          │
│ ✅ Update status meja ketika pelanggan selesai             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Visual table layout with status
- Guest count and order value per table
- Active orders list
- Ready-to-serve notifications
- Quick order creation
- Service tips

---

## 🎨 Color Coding

### Status Colors:
- 🔴 **Red:** Occupied, High Priority, Error
- 🟢 **Green:** Available, Completed, Success
- 🟡 **Yellow:** Reserved, Warning, Pending
- 🔵 **Blue:** Processing, Cooking, In Progress
- 🟣 **Purple:** Information, Waiter-related
- 🟠 **Orange:** Kitchen-related, Alerts

### Role Theme Colors:
- **Owner/Admin:** Blue (#2563EB) - Professional, Trust
- **Kasir:** Blue (#3B82F6) - Trustworthy, Transaction
- **Kitchen:** Orange/Red (#EA580C) - Heat, Energy, Urgency
- **Waiter:** Purple/Pink (#9333EA) - Service, Hospitality

---

## 📱 Responsive Design

All dashboards are:
- ✅ Mobile-friendly
- ✅ Tablet-optimized
- ✅ Desktop-ready
- ✅ Auto-adjusting layouts
- ✅ Touch-friendly buttons

---

## 🔄 Real-time Updates (Future)

Future enhancement untuk real-time updates:
- Kitchen receives new orders instantly
- Waiter sees order status changes live
- Kasir sees product stock updates
- Owner sees live sales dashboard

---

## 🎯 User Experience Highlights

### For Kasir:
- **Big "Buka Kasir" button** - Easy to find and click
- **Personal stats** - Only their transactions
- **Recent transactions** - Quick reference

### For Kitchen:
- **Priority system** - High priority orders highlighted in red
- **Customer notes** - Special instructions clearly visible
- **One-click actions** - Start cooking, mark as ready

### For Waiter:
- **Visual table map** - Quick overview of all tables
- **Color-coded status** - Easy to identify availability
- **Order notifications** - Know when food is ready

### For Owner/Admin:
- **Comprehensive view** - All business metrics
- **Quick actions** - Access any feature quickly
- **Analytics** - Trends and insights

---

## 📊 Data Visualization

### Charts (Future Enhancement):
- Sales trends graph
- Top products bar chart
- Customer analytics
- Hourly sales distribution

### Current Data Display:
- Stats cards with trends (↑ ↓)
- Badge indicators for status
- Progress indicators
- Color-coded priorities

---

**Created:** 2025-10-10
**Version:** 1.0.0
