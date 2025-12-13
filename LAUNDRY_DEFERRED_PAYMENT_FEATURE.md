# Fitur Pembayaran Ditunda untuk Laundry (Bayar Saat Pengambilan)

## 📋 Overview

Untuk bisnis laundry, biasanya pelanggan:
1. **Menyerahkan cucian** → Order dibuat dengan status `received`, pembayaran ditunda
2. **Cucian diproses** → Status berubah: `washing` → `ironing` → `ready`
3. **Pelanggan mengambil** → Pembayaran dilakukan saat pickup

Fitur ini memungkinkan kasir membuat order tanpa pembayaran langsung, lalu melunasinya nanti saat pelanggan mengambil cucian.

---

## 🎯 Situasi Saat Ini

### ✅ Yang Sudah Ada:
1. **Fitur "Tahan" (Hold Order)** 
   - Menyimpan cart sementara di frontend (local state)
   - Bisa memulihkan cart yang ditahan
   - **Masalah**: Hanya tersimpan di browser, hilang saat refresh/reload

2. **Payment Status di Database**
   - Field `payment_status` di table `orders`: `pending`, `partial`, `paid`, `refunded`
   - Order bisa dibuat dengan `payment_status = 'pending'`

3. **Order Status untuk Laundry**
   - Status flow: `received` → `washing` → `ironing` → `ready` → `completed` → `picked_up`

### ❌ Yang Belum Ada:
1. **Opsi "Bayar Nanti" di Payment Modal**
   - Modal saat ini hanya menawarkan pembayaran langsung
   - Tidak ada pilihan untuk defer payment

2. **Fitur Melihat Order Belum Dibayar**
   - Tidak ada UI untuk melihat daftar order dengan `payment_status = 'pending'`
   - Tidak ada cara untuk melunasi order yang sudah dibuat sebelumnya

3. **Flow Laundry yang Lengkap**
   - Order dibuat tanpa payment langsung
   - Bisa update status order (washing, ironing, ready)
   - Pembayaran saat status `ready` atau `picked_up`

---

## 💡 Solusi yang Diperlukan

### 1. Modifikasi Payment Modal untuk Laundry

**Tambah Opsi "Bayar Nanti"** yang hanya muncul untuk bisnis laundry:

```jsx
// PaymentModal.jsx - Tambahkan opsi baru
const paymentMethods = [
  // ... existing methods
  {
    id: 'deferred',
    name: 'Bayar Nanti',
    icon: Clock,
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    activeColor: 'bg-gray-600 text-white',
    // Hanya tampil untuk business type laundry
    showForBusinessTypes: ['laundry']
  }
];

// Logic untuk show/hide
const isLaundryBusiness = currentBusiness?.business_type?.code === 'laundry';
const availableMethods = paymentMethods.filter(method => {
  if (method.showForBusinessTypes) {
    return method.showForBusinessTypes.includes(currentBusiness?.business_type?.code);
  }
  return true;
});
```

**Ketika "Bayar Nanti" dipilih:**
- Tidak perlu input `amountPaid`
- Tidak ada validasi pembayaran
- Langsung buat order dengan `payment_status = 'pending'`
- Tampilkan nota/tiket yang bisa dipakai saat pengambilan

### 2. Modifikasi createOrder untuk Deferred Payment

**Backend sudah support**, tapi perlu memastikan:

```php
// POSController.php - createOrder method
// Order dibuat dengan:
'payment_status' => 'pending',  // ✅ Sudah ada
'paid_amount' => 0,              // ✅ Sudah ada
'status' => 'received',          // Untuk laundry

// Jika laundry, set status sesuai business type
if ($business->business_type->code === 'laundry') {
    $orderData['status'] = 'received';
}
```

### 3. Flow Pembayaran Ditunda

```
1. Pelanggan datang → Kasir input cucian
   ↓
2. Pilih "Bayar Nanti" → Order dibuat (status: received, payment_status: pending)
   ↓
3. Print tiket/pengambilan → Berikan ke pelanggan
   ↓
4. Cucian diproses → Update status: washing → ironing → ready
   ↓
5. Pelanggan mengambil → Kasir scan/input nomor tiket
   ↓
6. Kasir proses pembayaran → Update payment_status: paid
```

### 4. Fitur Melihat & Melunasi Order Belum Dibayar

**Halaman baru atau tab di POS: "Order Belum Dibayar"**

```jsx
// UnpaidOrdersTab.jsx
- Tampilkan daftar order dengan payment_status = 'pending'
- Filter: Order Number, Customer Name, Date, Total
- Action: 
  - "Bayar Sekarang" → Buka payment modal
  - "Lihat Detail" → Detail order
  - "Update Status" → Untuk laundry: washing, ironing, ready
```

**API Endpoint:**
```php
// GET /api/v1/orders/unpaid
// Filter: payment_status = 'pending'
// Sort: created_at DESC
```

### 5. Update Status Order Laundry

**Modal atau dropdown untuk update status:**

```jsx
// LaundryStatusModal.jsx
Status saat ini: received
Pilih status berikutnya:
- [ ] Washing
- [ ] Ironing  
- [ ] Ready (Siap Diambil)
- [ ] Completed

[Update Status] [Batal]
```

**API Endpoint:**
```php
// PATCH /api/v1/orders/{order}/status
// Body: { status: 'washing' | 'ironing' | 'ready' | 'completed' }
// Validasi: Status flow sesuai business type
```

---

## 📝 Implementasi Step-by-Step

### Step 1: Deteksi Business Type di Frontend

```jsx
// CashierPOS.jsx
import { useAuth } from '../../contexts/AuthContext';

const CashierPOS = () => {
  const { currentBusiness } = useAuth();
  const isLaundryBusiness = currentBusiness?.business_type?.code === 'laundry';
  
  // Pass ke PaymentModal
  <PaymentModal
    open={paymentModalOpen}
    allowDeferredPayment={isLaundryBusiness}
    // ...
  />
};
```

### Step 2: Tambahkan Opsi "Bayar Nanti" di PaymentModal

```jsx
// PaymentModal.jsx
const PaymentModal = ({ 
  open, 
  onClose, 
  cartTotal, 
  onPaymentComplete,
  allowDeferredPayment = false, // ✅ New prop
  onCreateOrder 
}) => {
  const [selectedMethod, setSelectedMethod] = useState('cash');
  
  const paymentMethods = [
    // ... existing methods
    ...(allowDeferredPayment ? [{
      id: 'deferred',
      name: 'Bayar Nanti',
      icon: Clock,
      color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      activeColor: 'bg-gray-600 text-white',
      description: 'Pembayaran saat pengambilan'
    }] : [])
  ];
  
  // Handle deferred payment
  const handleDeferredPayment = async () => {
    if (!onCreateOrder) {
      toast.error('Gagal membuat order');
      return;
    }
    
    setProcessing(true);
    try {
      // Create order without payment
      const orderId = await onCreateOrder();
      
      // Pass special flag untuk deferred payment
      await onPaymentComplete({
        method: 'deferred',
        amount: 0,
        change: 0,
        total: cartTotal,
        orderId: orderId
      });
      
      handleClose();
    } catch (error) {
      toast.error('Gagal membuat order: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };
  
  // Modify handleProcessPayment
  const handleProcessPayment = async () => {
    if (selectedMethod === 'deferred') {
      await handleDeferredPayment();
      return;
    }
    // ... existing payment logic
  };
  
  // Hide amount input for deferred payment
  {selectedMethod !== 'deferred' && selectedMethod !== 'midtrans' && (
    // ... amount input
  )}
};
```

### Step 3: Modifikasi handlePaymentComplete di CashierPOS

```jsx
// CashierPOS.jsx
const handlePaymentComplete = async paymentData => {
  try {
    const loadingToast = toast.loading('Memproses order...');
    
    // Create order
    const order = await createOrder();
    
    // ✅ Jika deferred payment, skip processPayment
    if (paymentData.method === 'deferred') {
      toast.dismiss(loadingToast);
      
      // Tampilkan tiket pengambilan
      toast.success(
        `✅ Order Berhasil Dibuat!\nOrder #${order.order_number}\n` +
        `Pembayaran ditunda sampai pengambilan\n` +
        `Total: ${formatCurrency(getTotalAmount())}`,
        { duration: 5000 }
      );
      
      // Print tiket pengambilan (jika perlu)
      // showPickupTicket(order);
      
      // Reset cart
      setCart([]);
      setSelectedCustomer(null);
      setAppliedDiscount(null);
      setPaymentModalOpen(false);
      
      return;
    }
    
    // Existing payment logic untuk method lainnya
    // ...
  } catch (error) {
    // ...
  }
};
```

### Step 4: Buat API untuk Order Belum Dibayar

```php
// OrderController.php
public function unpaidOrders(Request $request)
{
    $businessId = $request->header('X-Business-Id');
    $outletId = $request->header('X-Outlet-Id');
    
    $orders = Order::where('business_id', $businessId)
        ->where('outlet_id', $outletId)
        ->where('payment_status', 'pending')
        ->with(['customer', 'orderItems.product'])
        ->orderBy('created_at', 'desc')
        ->paginate(20);
    
    return response()->json([
        'success' => true,
        'data' => $orders
    ]);
}
```

**Route:**
```php
// routes/api.php
Route::get('/orders/unpaid', [OrderController::class, 'unpaidOrders'])
    ->middleware(['auth:sanctum', 'outlet.access']);
```

### Step 5: Buat UI untuk Order Belum Dibayar

```jsx
// UnpaidOrders.jsx - Component baru
import { useEffect, useState } from 'react';
import { Clock, DollarSign, Search } from 'lucide-react';
import { orderService } from '../../services/order.service';

const UnpaidOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadUnpaidOrders();
  }, []);
  
  const loadUnpaidOrders = async () => {
    setLoading(true);
    try {
      const result = await orderService.getUnpaidOrders();
      if (result.success) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Error loading unpaid orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePayNow = (order) => {
    // Buka payment modal dengan pre-filled order
    // ...
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Order Belum Dibayar ({orders.length})
        </h2>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Cari order number, customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Order List */}
      <div className="space-y-2">
        {orders.map(order => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">#{order.order_number}</p>
                  <p className="text-sm text-gray-600">
                    {order.customer?.name || 'Walk-in'} • {formatDate(order.created_at)}
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(order.total)}
                  </p>
                  <Badge variant={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <Button onClick={() => handlePayNow(order)}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Bayar Sekarang
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

### Step 6: Integrasi ke POS Kasir

```jsx
// CashierPOS.jsx - Tambahkan tab atau button
<div className="flex space-x-2 mb-4">
  <Button
    variant={activeTab === 'pos' ? 'default' : 'outline'}
    onClick={() => setActiveTab('pos')}
  >
    POS
  </Button>
  <Button
    variant={activeTab === 'unpaid' ? 'default' : 'outline'}
    onClick={() => setActiveTab('unpaid')}
    className="relative"
  >
    <Clock className="w-4 h-4 mr-2" />
    Belum Dibayar
    {unpaidCount > 0 && (
      <Badge className="ml-2">{unpaidCount}</Badge>
    )}
  </Button>
</div>

{activeTab === 'pos' && (
  // Existing POS interface
)}

{activeTab === 'unpaid' && (
  <UnpaidOrders onOrderPaid={loadUnpaidOrders} />
)}
```

---

## 🧪 Testing Scenarios

### Test Case 1: Buat Order dengan "Bayar Nanti"
1. Login sebagai kasir di bisnis laundry
2. Tambahkan item ke cart (misal: Cuci Kilat)
3. Klik "Proses Pembayaran"
4. Pilih "Bayar Nanti"
5. ✅ Order dibuat dengan `payment_status = 'pending'`
6. ✅ Nota/tiket pengambilan muncul
7. ✅ Cart dikosongkan

### Test Case 2: Lihat Order Belum Dibayar
1. Buka tab "Belum Dibayar"
2. ✅ Daftar order dengan `payment_status = 'pending'` muncul
3. Cek detail: Order number, customer, total, status

### Test Case 3: Bayar Order yang Sudah Dibuat
1. Pilih order dari daftar "Belum Dibayar"
2. Klik "Bayar Sekarang"
3. Pilih metode pembayaran (cash/card/transfer)
4. Input jumlah bayar
5. ✅ Order `payment_status` berubah jadi `paid`
6. ✅ Order hilang dari daftar "Belum Dibayar"

### Test Case 4: Update Status Laundry
1. Pilih order dengan status `received`
2. Update status ke `washing`
3. ✅ Status berubah
4. Update lagi ke `ironing` → `ready`
5. ✅ Status flow benar

---

## 📊 Database Changes (Jika Perlu)

### Migration (Optional)
Jika perlu track kapan order siap diambil:

```php
Schema::table('orders', function (Blueprint $table) {
    $table->timestamp('ready_at')->nullable()->after('ordered_at');
    $table->timestamp('picked_up_at')->nullable()->after('ready_at');
});
```

### Update Order Model
```php
// Order.php
protected $casts = [
    // ... existing
    'ready_at' => 'datetime',
    'picked_up_at' => 'datetime',
];
```

---

## 🎨 UI/UX Considerations

### 1. Visual Feedback
- **Badge/Indicator** untuk order belum dibayar (warna orange/kuning)
- **Icon Clock** untuk indicate "Bayar Nanti"
- **Notification** ketika order siap diambil (status = ready)

### 2. Print Ticket
- **Tiket Pengambilan** saat order dibuat dengan "Bayar Nanti"
- Berisi: Order number, tanggal, total, estimasi siap

### 3. Search & Filter
- Search by order number, customer name
- Filter by status (received, washing, ironing, ready)
- Sort by date, amount, status

---

## ✅ Checklist Implementasi

- [ ] **Frontend:**
  - [ ] Deteksi business type laundry di CashierPOS
  - [ ] Tambahkan prop `allowDeferredPayment` ke PaymentModal
  - [ ] Tambahkan opsi "Bayar Nanti" di PaymentModal
  - [ ] Handle deferred payment di handlePaymentComplete
  - [ ] Buat component UnpaidOrders
  - [ ] Tambahkan tab "Belum Dibayar" di CashierPOS
  - [ ] Buat component LaundryStatusUpdate (optional)

- [ ] **Backend:**
  - [ ] Pastikan createOrder support `payment_status = 'pending'`
  - [ ] Buat endpoint GET /api/v1/orders/unpaid
  - [ ] Buat endpoint PATCH /api/v1/orders/{id}/status
  - [ ] Validasi status flow sesuai business type
  - [ ] Pastikan processPayment bisa handle order yang sudah ada

- [ ] **Service:**
  - [ ] Tambahkan method `getUnpaidOrders()` di order.service.js
  - [ ] Tambahkan method `updateOrderStatus()` di order.service.js

- [ ] **Testing:**
  - [ ] Test create order dengan "Bayar Nanti"
  - [ ] Test view unpaid orders
  - [ ] Test pay existing unpaid order
  - [ ] Test update laundry status
  - [ ] Test edge cases (cancel, refund, etc)

---

## 📚 Referensi

- [Cashier POS Implementation](./app/CASHIER_POS_IMPLEMENTATION.md)
- [Laundry Setup Guide](./LAUNDRY_SETUP_GUIDE.md)
- [Flexible POS System](./FLEXIBLE_POS_SYSTEM.md)
- [Order Status Flow](./FLEXIBLE_POS_SYSTEM.md#laundry-configuration)

---

## 🚀 Quick Start

### Untuk Development:

1. **Check Business Type:**
   ```sql
   SELECT * FROM business_types WHERE code = 'laundry';
   ```

2. **Test Order dengan Payment Pending:**
   ```php
   // Via tinker
   $order = Order::create([
       'payment_status' => 'pending',
       'status' => 'received',
       // ... other fields
   ]);
   ```

3. **Query Unpaid Orders:**
   ```sql
   SELECT * FROM orders 
   WHERE payment_status = 'pending' 
   AND business_id = {your_business_id}
   ORDER BY created_at DESC;
   ```

---

**Versi:** 1.0  
**Terakhir Diupdate:** 2025-01-15  
**Status:** 📝 Dokumentasi - Belum Diimplementasikan












































