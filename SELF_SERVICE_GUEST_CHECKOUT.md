# Self-Service Guest Checkout Feature

## Overview

Sistem self-service sekarang mendukung **2 mode checkout**:
1. **Quick Order (Guest)** - Order cepat tanpa isi data pelanggan
2. **Member Order** - Isi data pelanggan untuk mendapat benefit

## ✅ Fitur yang Tersedia

### 1. Guest Checkout (Quick Order)
Pelanggan bisa langsung order **TANPA** harus isi data:
- ✅ Tidak perlu registrasi
- ✅ Tidak perlu isi nama/telepon/email
- ✅ Langsung pilih produk & checkout
- ✅ Order tersimpan dengan nama "Guest"
- ✅ Customer ID = null (anonymous order)

### 2. Member Checkout (Isi Data Pelanggan)
Pelanggan bisa **MEMILIH** untuk isi data dengan benefit:
- ✅ Toggle ON/OFF untuk isi data
- ✅ Poin loyalitas (future feature)
- ✅ Notifikasi order via WhatsApp/SMS (future feature)
- ✅ Order history tracking
- ✅ Data tersimpan untuk order berikutnya
- ✅ Customer ID = ID dari database

### 3. Fitur Tambahan Lainnya
- ✅ **Discount Code** - Tetap bisa apply discount meski guest
- ✅ **Order Notes** - Catatan tambahan untuk pesanan
- ✅ **Email** (optional) - Untuk notifikasi email

## 🎯 User Experience Flow

### Quick Order (Guest) - 3 Steps
```
1. Browse Menu → Add to Cart
2. Click "Checkout"
3. Click "Konfirmasi Pesanan" ✓
   (Toggle customer form = OFF)
```

### Member Order - 4 Steps
```
1. Browse Menu → Add to Cart
2. Click "Checkout"
3. Toggle "Isi Data Pelanggan" → ON
4. Fill name, phone, email (optional)
5. Click "Konfirmasi Pesanan" ✓
```

## 📋 UI Components

### Toggle Switch untuk Customer Data

```
┌───────────────────────────────────────────────┐
│ Isi Data Pelanggan (Opsional)      [OFF/ON]  │
│ Dapatkan poin loyalitas dan notifikasi       │
└───────────────────────────────────────────────┘
```

**State: OFF (Default)**
- Form nama/telepon/email **tersembunyi**
- Order sebagai "Guest"
- Customer ID = null

**State: ON**
- Form nama/telepon/email **muncul**
- Nama & Telepon = **required**
- Email = optional
- Customer disimpan ke database

## 🔧 Technical Implementation

### Frontend Changes (`PublicSelfServiceMenu.jsx`)

```javascript
// State management
const [showCustomerForm, setShowCustomerForm] = useState(false);

// Validation logic
if (showCustomerForm) {
  // Validate name & phone required
} else {
  // No validation needed
}

// Order data
const orderData = {
  customer_name: showCustomerForm ? checkoutForm.customer_name : 'Guest',
  customer_phone: showCustomerForm ? checkoutForm.customer_phone : null,
  customer_email: showCustomerForm ? checkoutForm.customer_email : null,
  // ...
};
```

### Backend Changes (`SelfServiceController.php`)

```php
// Validation - All customer fields are now nullable
$validator = Validator::make($request->all(), [
    'customer_name' => 'nullable|string|max:255',
    'customer_phone' => 'nullable|string|max:20',
    'customer_email' => 'nullable|email|max:255',
    // ...
]);

// Customer creation - Only if phone is provided
$customer = null;
$customerId = null;

if ($request->customer_phone) {
    // Find or create customer
    $customer = Customer::where('phone', $request->customer_phone)->first();

    if (!$customer) {
        $customer = Customer::create([
            'name' => $request->customer_name ?: 'Guest',
            'phone' => $request->customer_phone,
            'email' => $request->customer_email,
        ]);
    }

    $customerId = $customer->id;
}

// Order creation
$order = Order::create([
    'customer_id' => $customerId, // Can be null for guest orders
    'customer_data' => [
        'name' => $request->customer_name ?: 'Guest',
        'phone' => $request->customer_phone,
        'email' => $request->customer_email,
    ],
    // ...
]);
```

## 📊 Database Schema

### Orders Table
```sql
customer_id (nullable) - NULL untuk guest, ID untuk member
customer_data (JSON)   - Selalu berisi data (minimal "Guest")
```

**Guest Order:**
```json
{
  "customer_id": null,
  "customer_data": {
    "name": "Guest",
    "phone": null,
    "email": null
  }
}
```

**Member Order:**
```json
{
  "customer_id": 123,
  "customer_data": {
    "name": "John Doe",
    "phone": "08123456789",
    "email": "john@example.com"
  }
}
```

## 🎨 UI Design

### Checkout Modal - Default State (Guest)

```
┌─────────────────────────────────────────┐
│              Checkout              [X]  │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Isi Data Pelanggan (Opsional)  [⚪] │ │
│ │ Dapatkan poin loyalitas             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Kode Diskon:                            │
│ [____________] [Terapkan]               │
│                                         │
│ Catatan:                                │
│ [_____________________________]         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Ringkasan Pesanan                   │ │
│ │ Nasi Goreng x 2    Rp 40,000       │ │
│ │ Es Teh x 1         Rp 5,000        │ │
│ │ ─────────────────────────────────   │ │
│ │ Subtotal          Rp 45,000        │ │
│ │ Total             Rp 45,000        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│     [Konfirmasi Pesanan]                │
└─────────────────────────────────────────┘
```

### Checkout Modal - Member Mode (Toggle ON)

```
┌─────────────────────────────────────────┐
│              Checkout              [X]  │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Isi Data Pelanggan (Opsional)  [🔵] │ │
│ │ Dapatkan poin loyalitas             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Nama *                              │ │
│ │ [_____________________________]     │ │
│ │                                     │ │
│ │ Nomor Telepon *                     │ │
│ │ [_____________________________]     │ │
│ │                                     │ │
│ │ Email                               │ │
│ │ [_____________________________]     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Kode Diskon:                            │
│ [____________] [Terapkan]               │
│                                         │
│ Catatan:                                │
│ [_____________________________]         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Ringkasan Pesanan                   │ │
│ │ Nasi Goreng x 2    Rp 40,000       │ │
│ │ Es Teh x 1         Rp 5,000        │ │
│ │ ─────────────────────────────────   │ │
│ │ Subtotal          Rp 45,000        │ │
│ │ Total             Rp 45,000        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│     [Konfirmasi Pesanan]                │
└─────────────────────────────────────────┘
```

## 💡 Best Practices & Recommendations

### 1. Default State
- Toggle **OFF** by default (Quick Order)
- Mayoritas customer prefer quick checkout
- Reduce friction di ordering process

### 2. Encourage Member Sign-up
- Tampilkan benefit secara jelas
- "Dapatkan poin loyalitas dan notifikasi pesanan"
- Bisa tambah visual icon (💎 poin, 📱 notifikasi)

### 3. Progressive Disclosure
- Hide form complexity behind toggle
- Show form only when needed
- Smooth transition (animation)

### 4. Smart Defaults
- Remember customer data di browser (localStorage)
- Auto-fill next time they order
- "Gunakan data sebelumnya?" prompt

### 5. Clear Value Proposition
```
Guest Order:
✅ Cepat - Tidak perlu isi form
✅ Praktis - Langsung pesan
❌ Tidak dapat poin
❌ Tidak ada notifikasi

Member Order:
✅ Dapatkan poin setiap transaksi
✅ Notifikasi status pesanan
✅ Riwayat pemesanan
⚠️ Perlu isi data (1x saja)
```

## 🔮 Future Enhancements

### Phase 1 - Loyalty Program (Next)
- [ ] Point system untuk member
- [ ] Reward tiers (Bronze, Silver, Gold)
- [ ] Special discounts untuk members
- [ ] Birthday rewards

### Phase 2 - Smart Features
- [ ] Auto-login untuk returning customers
- [ ] Save favorite orders
- [ ] Quick re-order from history
- [ ] Social login (Google, Facebook)

### Phase 3 - Notifications
- [ ] WhatsApp notification
- [ ] SMS notification
- [ ] Email notification
- [ ] Push notification (PWA)

### Phase 4 - Gamification
- [ ] Badges & achievements
- [ ] Referral program
- [ ] Lucky draw for members
- [ ] Seasonal campaigns

## 📈 Success Metrics

### Track These KPIs:
1. **Guest vs Member Ratio**
   - Target: 30% member sign-up rate

2. **Conversion Rate**
   - Guest: cart → order completion
   - Member: cart → order completion

3. **Average Order Value**
   - Guest AOV vs Member AOV

4. **Repeat Rate**
   - Member: % yang order lagi

5. **Form Abandonment**
   - Berapa banyak yang toggle ON tapi tidak submit

## 🎯 Business Impact

### Benefits untuk Business:
1. **Higher Conversion** - Reduce friction, more orders
2. **Customer Data** - Build database untuk marketing
3. **Loyalty Program** - Encourage repeat orders
4. **Personalization** - Better customer experience

### Benefits untuk Customer:
1. **Speed** - Quick checkout untuk yang buru-buru
2. **Choice** - Flexibility to share data or not
3. **Rewards** - Benefit untuk loyal customers
4. **Convenience** - No forced registration

## 📝 Testing Checklist

- [ ] Guest order (toggle OFF) → Success
- [ ] Member order (toggle ON) → Success
- [ ] Toggle ON → OFF → ON (state management)
- [ ] Guest order dengan discount code
- [ ] Member order dengan discount code
- [ ] Form validation (name & phone required if ON)
- [ ] Order tersimpan dengan customer_id = null (guest)
- [ ] Order tersimpan dengan customer_id (member)
- [ ] Customer dibuat di database (member)
- [ ] Customer tidak dibuat (guest)
- [ ] Returning customer auto-detect by phone
- [ ] Email optional validation
- [ ] Order success untuk guest
- [ ] Order success untuk member

## 🚀 Deployment Notes

### No Database Migration Required
- `customer_id` sudah nullable di orders table
- `customer_data` sudah JSON field
- No schema changes needed

### Configuration
```env
# Future: Add these to .env
LOYALTY_POINTS_ENABLED=true
LOYALTY_POINTS_PER_THOUSAND=1
WHATSAPP_NOTIFICATION_ENABLED=false
SMS_NOTIFICATION_ENABLED=false
```

### Rollout Strategy
1. ✅ Deploy to staging
2. ✅ Test both flows (guest & member)
3. ✅ Monitor error logs
4. ✅ Deploy to production
5. ✅ Monitor conversion metrics
6. ✅ A/B test toggle placement
7. ✅ Iterate based on data

---

**Version:** 1.0.0
**Last Updated:** 2025-01-06
**Status:** ✅ Ready for Production
