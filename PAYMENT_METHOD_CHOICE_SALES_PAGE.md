# Pilihan Metode Pembayaran di Halaman Penjualan

## 🎯 **Perubahan**

Sebelumnya, di halaman penjualan (Sales Management) untuk order dengan status "Menunggu" (pending/unpaid), tombol "Bayar" langsung membuka Midtrans payment.

Sekarang, tombol "Bayar" membuka **PaymentModal** dengan **pilihan metode pembayaran**:

- ✅ **Cash** (Tunai)
- ✅ **Card** (Kartu)
- ✅ **Transfer** (Transfer Bank)
- ✅ **QRIS/Midtrans** (E-Wallet, QRIS, dll)

---

## 📋 **File yang Diubah**

### **1. `app/frontend/src/components/sales/SalesManagement.jsx`**

#### **a. Import PaymentModal:**

```javascript
import PaymentModal from "../modals/PaymentModal";
```

#### **b. State untuk Payment Modal:**

```javascript
// Payment modal (untuk pilihan pembayaran)
const [paymentModalOpen, setPaymentModalOpen] = useState(false);
const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

// Retry payment modal (untuk Midtrans dari PaymentModal)
const [retryPaymentModalOpen, setRetryPaymentModalOpen] = useState(false);
const [retryPaymentData, setRetryPaymentData] = useState(null);
```

#### **c. Handler untuk Payment:**

```javascript
// ✅ FIX: Handle payment untuk order yang belum dibayar - buka PaymentModal dengan pilihan
const handlePayment = (orderId) => {
  // Cari order dari list
  const orderList = usingShiftOrders ? shiftOrders : orders || [];
  const order = orderList.find((o) => o.id === orderId);

  if (!order) {
    toast.error("Order tidak ditemukan");
    return;
  }

  // Set order untuk payment modal
  setSelectedOrderForPayment(order);
  setPaymentModalOpen(true);
};
```

#### **d. Handler untuk Payment Completion:**

```javascript
const handlePaymentComplete = async (paymentData) => {
  // Apply discount jika ada
  // Process payment untuk cash/card/transfer
  // QRIS/Midtrans sudah di-handle oleh PaymentModal
};
```

#### **e. Update Tombol "Bayar":**

```javascript
{
  /* Tombol Bayar untuk order yang belum dibayar */
}
{
  (order.payment_status === "pending" ||
    order.payment_status === "unpaid" ||
    order.payment_status === "failed") && (
    <Button
      size="sm"
      variant="default"
      className="bg-green-600 hover:bg-green-700 text-white"
      onClick={() => handlePayment(order.id)}
      title="Pilih Metode Pembayaran"
    >
      <DollarSign className="w-4 h-4 mr-1" />
      Bayar
    </Button>
  );
}
```

#### **f. Tambah PaymentModal Component:**

```javascript
{
  /* Payment Modal - Pilihan Metode Pembayaran */
}
{
  paymentModalOpen && selectedOrderForPayment && (
    <PaymentModal
      open={paymentModalOpen}
      onClose={() => {
        setPaymentModalOpen(false);
        setSelectedOrderForPayment(null);
      }}
      cartTotal={
        selectedOrderForPayment.total ||
        selectedOrderForPayment.total_amount ||
        0
      }
      onPaymentComplete={handlePaymentComplete}
      orderId={selectedOrderForPayment.id}
      allowDeferredPayment={false}
    />
  );
}
```

---

### **2. `app/frontend/src/components/modals/PaymentModal.jsx`**

#### **Update untuk handle existing order dengan QRIS:**

```javascript
// Handle Midtrans payment (E-Wallet, VA, QRIS, etc)
if (selectedMethod === "midtrans" || selectedMethod === "qris") {
  // ✅ FIX: Untuk existing order, gunakan orderService.processPayment
  if (orderId) {
    // Existing order - process payment via orderService
    const { orderService } = await import("../../services/order.service");

    const paymentResult = await orderService.processPayment(currentOrderId, {
      method: "qris",
      amount: calculateTotalAfterDiscount(),
    });

    // Check if paymentResult has snap_token
    const snapToken =
      paymentResult.data?.data?.snap_token || paymentResult.data?.snap_token;
    const clientKey =
      paymentResult.data?.data?.client_key || paymentResult.data?.client_key;

    if (snapToken) {
      // Show Midtrans modal with snap token
      setQrisData({
        snap_token: snapToken,
        client_key: clientKey,
        order_number: paymentResult.data?.order_number,
      });
      setShowQrisModal(true);
      handleClose();
      return;
    }
  }
}
```

---

## ✅ **Fitur yang Tersedia**

### **1. Pilihan Metode Pembayaran:**

- ✅ **Cash** - Tunai dengan input jumlah bayar dan kembalian
- ✅ **Card** - Kartu debit/kredit
- ✅ **Transfer** - Transfer Bank
- ✅ **QRIS/Midtrans** - E-Wallet, QRIS, VA, dll

### **2. Fitur PaymentModal:**

- ✅ Apply coupon/discount
- ✅ Display subtotal, discount, dan total
- ✅ Input jumlah bayar (untuk cash)
- ✅ Auto-calculate kembalian
- ✅ Quick amount buttons (50K, 100K, 200K)

### **3. Flow Pembayaran:**

#### **Untuk Cash/Card/Transfer:**

1. User klik "Bayar" → PaymentModal terbuka
2. User pilih metode pembayaran (cash/card/transfer)
3. User input jumlah bayar (jika cash)
4. User klik "Bayar Sekarang"
5. Payment diproses → Order status updated → Refresh data

#### **Untuk QRIS/Midtrans:**

1. User klik "Bayar" → PaymentModal terbuka
2. User pilih "QRIS/Midtrans"
3. User klik "Bayar Sekarang"
4. PaymentModal create Midtrans payment → QRISPaymentModal terbuka
5. User selesaikan pembayaran di Midtrans
6. Payment success → Order status updated → Refresh data

---

## 🎨 **UI Changes**

### **Sebelum:**

- Tombol "Bayar" warna **ungu** (purple) dengan icon **QRIS**
- Tooltip: "Bayar dengan Midtrans"
- Langsung buka Midtrans payment

### **Sesudah:**

- Tombol "Bayar" warna **hijau** (green) dengan icon **DollarSign**
- Tooltip: "Pilih Metode Pembayaran"
- Buka PaymentModal dengan pilihan metode pembayaran

---

## 🔍 **Testing Checklist**

- [ ] Order pending muncul dengan tombol "Bayar" hijau
- [ ] Klik "Bayar" → PaymentModal terbuka
- [ ] Pilih metode pembayaran:
  - [ ] Cash → Input jumlah bayar → Kembalian terhitung → Payment success
  - [ ] Card → Payment success
  - [ ] Transfer → Payment success
  - [ ] QRIS/Midtrans → QRISPaymentModal terbuka → Payment success
- [ ] Apply coupon/discount → Total ter-update
- [ ] Payment success → Order status updated → Refresh data

---

## 📝 **Catatan**

1. **PaymentModal** mendukung existing order dengan `orderId` prop
2. **QRIS/Midtrans** untuk existing order akan menggunakan `orderService.processPayment`
3. **Cash/Card/Transfer** akan diproses via `orderService.processPayment` juga
4. **Discount** bisa diterapkan sebelum payment
5. **Order status** akan otomatis update setelah payment success

---

## ✅ **Status: COMPLETE**

Fitur pilihan metode pembayaran di halaman penjualan sudah selesai! 🎉
