# Toast Notification Implementation Guide

## 📢 Overview

Semua endpoint API sekarang mengirimkan `toast` object dalam response untuk memberikan feedback visual kepada user.

## 🎨 Toast Object Structure

```typescript
interface ToastNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number; // in milliseconds
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  toast?: ToastNotification;
  error?: string;
}
```

## 📋 Toast Types & Use Cases

### ✅ Success (type: 'success')
Digunakan untuk operasi yang berhasil tanpa masalah

**Warna**: Hijau
**Icon**: ✓ (checkmark)
**Contoh**:
- Shift berhasil dibuka
- Transaksi berhasil diproses
- Shift ditutup tanpa selisih kas

### ❌ Error (type: 'error')
Digunakan untuk operasi yang gagal atau ada kesalahan

**Warna**: Merah
**Icon**: ✕ (cross)
**Contoh**:
- Gagal membuka shift
- Transaksi gagal diproses
- Shift ditutup dengan kekurangan kas

### ⚠️ Warning (type: 'warning')
Digunakan untuk operasi berhasil tapi ada sesuatu yang perlu diperhatikan

**Warna**: Kuning/Orange
**Icon**: ⚠ (warning sign)
**Contoh**:
- Shift ditutup dengan kelebihan kas
- Stock produk menipis
- Pembayaran partial

### ℹ️ Info (type: 'info')
Digunakan untuk informasi umum

**Warna**: Biru
**Icon**: ℹ (info)
**Contoh**:
- Reminder
- Tips
- Informasi sistem

## 🔔 API Endpoints dengan Toast

### POS Operations

#### 1. Create Order (Buat Pesanan)

**Endpoint**: `POST /api/v1/orders`

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "toast": {
    "type": "success",
    "title": "Order Dibuat",
    "message": "Order #ORD-ABC123 berhasil dibuat dengan 3 item. Total: Rp 150.000",
    "duration": 3000
  }
}
```

**Error Response (Stock Habis)**:
```json
{
  "success": false,
  "error": "Failed to create order",
  "message": "Stok produk 'Nasi Goreng' tidak mencukupi. Stok tersedia: 2",
  "toast": {
    "type": "error",
    "title": "Gagal Membuat Order",
    "message": "Stok produk 'Nasi Goreng' tidak mencukupi. Stok tersedia: 2",
    "duration": 5000
  }
}
```

#### 2. Process Payment (Proses Pembayaran)

**Endpoint**: `POST /api/v1/orders/{id}/payment`

**Success Response (Ada Kembalian)**:
```json
{
  "success": true,
  "data": { ... },
  "toast": {
    "type": "success",
    "title": "Transaksi Berhasil",
    "message": "Pembayaran berhasil diproses. Kembalian: Rp 5.000",
    "duration": 3000
  }
}
```

**Success Response (Pas)**:
```json
{
  "toast": {
    "type": "success",
    "title": "Transaksi Berhasil",
    "message": "Pembayaran berhasil diproses. ",
    "duration": 3000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Failed to process payment",
  "message": "...",
  "toast": {
    "type": "error",
    "title": "Transaksi Gagal",
    "message": "Pembayaran gagal diproses. Silakan coba lagi.",
    "duration": 5000
  }
}
```

#### 3. Cancel Order (Batalkan Order)

**Endpoint**: `POST /api/v1/orders/{id}/cancel`

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "toast": {
    "type": "info",
    "title": "Order Dibatalkan",
    "message": "Order #ORD-ABC123 berhasil dibatalkan. Stock produk telah dikembalikan.",
    "duration": 4000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Failed to cancel order",
  "message": "...",
  "toast": {
    "type": "error",
    "title": "Gagal Membatalkan Order",
    "message": "Terjadi kesalahan saat membatalkan order. Silakan coba lagi.",
    "duration": 5000
  }
}
```

#### 4. Refund Order

**Endpoint**: `POST /api/v1/orders/{id}/refund`

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "toast": {
    "type": "warning",
    "title": "Order Direfund",
    "message": "Order #ORD-ABC123 berhasil direfund sebesar Rp 150.000. Stock produk telah dikembalikan.",
    "duration": 5000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Failed to refund order",
  "message": "...",
  "toast": {
    "type": "error",
    "title": "Gagal Refund Order",
    "message": "Terjadi kesalahan saat refund order. Silakan coba lagi.",
    "duration": 5000
  }
}
```

#### 5. Update Order

**Endpoint**: `PUT /api/v1/orders/{id}`

**Success Response**:
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": { ... },
  "toast": {
    "type": "success",
    "title": "Order Diupdate",
    "message": "Order #ORD-ABC123 berhasil diupdate.",
    "duration": 3000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Failed to update order",
  "error": "...",
  "toast": {
    "type": "error",
    "title": "Gagal Update Order",
    "message": "Terjadi kesalahan saat update order. Silakan coba lagi.",
    "duration": 5000
  }
}
```

### Shift Operations

### 1. Buka Shift

**Endpoint**: `POST /api/v1/shifts/open`

**Success Response**:
```json
{
  "success": true,
  "message": "Shift berhasil dibuka",
  "data": { ... },
  "toast": {
    "type": "success",
    "title": "Shift Dibuka",
    "message": "Shift Pagi berhasil dibuka dengan modal awal Rp 100.000",
    "duration": 3000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Gagal membuka shift",
  "error": "...",
  "toast": {
    "type": "error",
    "title": "Gagal Membuka Shift",
    "message": "Terjadi kesalahan saat membuka shift. Silakan coba lagi.",
    "duration": 5000
  }
}
```

### 2. Tutup Shift

**Endpoint**: `POST /api/v1/shifts/{id}/close`

**Success Response (Kas Pas)**:
```json
{
  "success": true,
  "message": "Shift berhasil ditutup",
  "data": { ... },
  "toast": {
    "type": "success",
    "title": "Shift Ditutup",
    "message": "Shift berhasil ditutup. Uang kas pas, tidak ada selisih.",
    "duration": 5000
  }
}
```

**Success Response (Kas Lebih)**:
```json
{
  "toast": {
    "type": "warning",
    "title": "Shift Ditutup - Ada Kelebihan",
    "message": "Shift berhasil ditutup. Terdapat kelebihan kas sebesar Rp 5.000",
    "duration": 5000
  }
}
```

**Success Response (Kas Kurang)**:
```json
{
  "toast": {
    "type": "error",
    "title": "Shift Ditutup - Ada Kekurangan",
    "message": "Shift berhasil ditutup. Terdapat kekurangan kas sebesar Rp 10.000",
    "duration": 5000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Gagal menutup shift",
  "error": "...",
  "toast": {
    "type": "error",
    "title": "Gagal Menutup Shift",
    "message": "Terjadi kesalahan saat menutup shift. Silakan coba lagi.",
    "duration": 5000
  }
}
```

### 3. Process Payment (Transaksi)

**Endpoint**: `POST /api/v1/orders/{id}/payment`

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "toast": {
    "type": "success",
    "title": "Transaksi Berhasil",
    "message": "Pembayaran berhasil diproses. Kembalian: Rp 5.000",
    "duration": 3000
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Failed to process payment",
  "message": "...",
  "toast": {
    "type": "error",
    "title": "Transaksi Gagal",
    "message": "Pembayaran gagal diproses. Silakan coba lagi.",
    "duration": 5000
  }
}
```

## 💻 Frontend Implementation

### React/Next.js with Toastify

```typescript
import { toast } from 'react-toastify';

interface ToastData {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number;
}

// Helper function to show toast
const showToast = (toastData: ToastData) => {
  const options = {
    autoClose: toastData.duration,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  switch (toastData.type) {
    case 'success':
      toast.success(toastData.message, options);
      break;
    case 'error':
      toast.error(toastData.message, options);
      break;
    case 'warning':
      toast.warn(toastData.message, options);
      break;
    case 'info':
      toast.info(toastData.message, options);
      break;
  }
};

// Example: Open Shift
const openShift = async (data: OpenShiftRequest) => {
  try {
    const response = await fetch('/api/v1/shifts/open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Outlet-Id': outletId,
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    // Show toast notification
    if (result.toast) {
      showToast(result.toast);
    }

    if (result.success) {
      // Handle success
      console.log('Shift opened:', result.data);
    } else {
      // Handle error
      console.error('Failed:', result.message);
    }

  } catch (error) {
    // Show generic error toast
    toast.error('Terjadi kesalahan. Silakan coba lagi.');
  }
};

// Example: Close Shift
const closeShift = async (shiftId: number, actualCash: number) => {
  try {
    const response = await fetch(`/api/v1/shifts/${shiftId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Outlet-Id': outletId,
      },
      body: JSON.stringify({ actual_cash: actualCash })
    });

    const result = await response.json();

    // Show toast notification
    if (result.toast) {
      showToast(result.toast);
    }

  } catch (error) {
    toast.error('Terjadi kesalahan saat menutup shift.');
  }
};

// Example: Process Payment
const processPayment = async (orderId: number, paymentData: PaymentRequest) => {
  try {
    const response = await fetch(`/api/v1/orders/${orderId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Outlet-Id': outletId,
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    // Show toast notification
    if (result.toast) {
      showToast(result.toast);
    }

    if (result.success) {
      // Redirect to receipt or order list
      router.push('/orders');
    }

  } catch (error) {
    toast.error('Transaksi gagal. Silakan coba lagi.');
  }
};
```

### Vue.js with vue-toastification

```typescript
import { useToast } from 'vue-toastification';

const toast = useToast();

// Helper function
const showToast = (toastData: any) => {
  const options = {
    timeout: toastData.duration,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    showCloseButtonOnHover: false,
  };

  switch (toastData.type) {
    case 'success':
      toast.success(toastData.message, options);
      break;
    case 'error':
      toast.error(toastData.message, options);
      break;
    case 'warning':
      toast.warning(toastData.message, options);
      break;
    case 'info':
      toast.info(toastData.message, options);
      break;
  }
};

// Example usage
const closeShift = async (shiftId: number, actualCash: number) => {
  try {
    const response = await fetch(`/api/v1/shifts/${shiftId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Business-Id': businessId,
        'X-Outlet-Id': outletId,
      },
      body: JSON.stringify({ actual_cash: actualCash })
    });

    const result = await response.json();

    if (result.toast) {
      showToast(result.toast);
    }

  } catch (error) {
    toast.error('Terjadi kesalahan saat menutup shift.');
  }
};
```

### Vanilla JavaScript with Toastify

```javascript
// Using toastify-js library
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

function showToast(toastData) {
  let backgroundColor = '#4caf50'; // success

  switch (toastData.type) {
    case 'success':
      backgroundColor = '#4caf50';
      break;
    case 'error':
      backgroundColor = '#f44336';
      break;
    case 'warning':
      backgroundColor = '#ff9800';
      break;
    case 'info':
      backgroundColor = '#2196f3';
      break;
  }

  Toastify({
    text: toastData.message,
    duration: toastData.duration,
    gravity: 'top',
    position: 'right',
    backgroundColor: backgroundColor,
    stopOnFocus: true,
  }).showToast();
}

// Example usage
async function closeShift(shiftId, actualCash) {
  try {
    const response = await fetch(`/api/v1/shifts/${shiftId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Business-Id': localStorage.getItem('businessId'),
        'X-Outlet-Id': localStorage.getItem('outletId'),
      },
      body: JSON.stringify({ actual_cash: actualCash })
    });

    const result = await response.json();

    if (result.toast) {
      showToast(result.toast);
    }

  } catch (error) {
    showToast({
      type: 'error',
      message: 'Terjadi kesalahan saat menutup shift.',
      duration: 5000
    });
  }
}
```

## 🎨 UI Design Recommendations

### Toast Position
- **Desktop**: Top-right corner
- **Mobile**: Top-center or bottom-center

### Toast Styling

**Success**:
```css
.toast-success {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* atau */
  background: #4caf50;
  color: white;
  border-left: 4px solid #2e7d32;
}
```

**Error**:
```css
.toast-error {
  background: #f44336;
  color: white;
  border-left: 4px solid #c62828;
}
```

**Warning**:
```css
.toast-warning {
  background: #ff9800;
  color: white;
  border-left: 4px solid #ef6c00;
}
```

**Info**:
```css
.toast-info {
  background: #2196f3;
  color: white;
  border-left: 4px solid #1565c0;
}
```

## 📱 Toast Examples by Scenario

### Scenario 1: Buka Shift Berhasil
```
┌────────────────────────────────────┐
│ ✓ Shift Dibuka                     │
│ Shift Pagi berhasil dibuka dengan  │
│ modal awal Rp 100.000              │
└────────────────────────────────────┘
```

### Scenario 2: Transaksi Berhasil (Ada Kembalian)
```
┌────────────────────────────────────┐
│ ✓ Transaksi Berhasil               │
│ Pembayaran berhasil diproses.      │
│ Kembalian: Rp 5.000                │
└────────────────────────────────────┘
```

### Scenario 3: Tutup Shift (Kas Pas)
```
┌────────────────────────────────────┐
│ ✓ Shift Ditutup                    │
│ Shift berhasil ditutup. Uang kas   │
│ pas, tidak ada selisih.            │
└────────────────────────────────────┘
```

### Scenario 4: Tutup Shift (Kas Lebih)
```
┌────────────────────────────────────┐
│ ⚠ Shift Ditutup - Ada Kelebihan    │
│ Shift berhasil ditutup. Terdapat   │
│ kelebihan kas sebesar Rp 5.000     │
└────────────────────────────────────┘
```

### Scenario 5: Tutup Shift (Kas Kurang)
```
┌────────────────────────────────────┐
│ ✕ Shift Ditutup - Ada Kekurangan   │
│ Shift berhasil ditutup. Terdapat   │
│ kekurangan kas sebesar Rp 10.000   │
└────────────────────────────────────┘
```

### Scenario 6: Gagal Membuka Shift
```
┌────────────────────────────────────┐
│ ✕ Gagal Membuka Shift              │
│ Terjadi kesalahan saat membuka     │
│ shift. Silakan coba lagi.          │
└────────────────────────────────────┘
```

## ✅ Implementation Checklist

- [ ] Install toast library (react-toastify, vue-toastification, atau toastify-js)
- [ ] Setup toast provider di app root
- [ ] Create helper function `showToast()`
- [ ] Update all API calls to handle `toast` object in response
- [ ] Test buka shift → verify toast appears
- [ ] Test transaksi → verify toast with kembalian
- [ ] Test tutup shift (kas pas) → verify success toast
- [ ] Test tutup shift (kas lebih) → verify warning toast
- [ ] Test tutup shift (kas kurang) → verify error toast
- [ ] Test error scenarios → verify error toasts
- [ ] Style toasts according to design system
- [ ] Test on mobile devices
- [ ] Add animations (fade in/out)

## 🔧 Troubleshooting

### Toast tidak muncul
1. Check console untuk errors
2. Verify toast library installed
3. Check if `result.toast` exists in response
4. Verify toast provider setup correctly

### Toast muncul tapi styling salah
1. Import CSS dari toast library
2. Check custom CSS tidak override library styles
3. Verify colors dan icons sesuai type

### Toast muncul terlalu cepat hilang
1. Check `duration` value in toast object
2. Adjust `autoClose` or `timeout` in options
3. Enable `pauseOnHover` untuk user experience lebih baik

## 📚 Recommended Libraries

### React
- **react-toastify**: https://fkhadra.github.io/react-toastify/
  ```bash
  npm install react-toastify
  ```

### Vue
- **vue-toastification**: https://vue-toastification.maronato.dev/
  ```bash
  npm install vue-toastification@next
  ```

### Vanilla JS
- **toastify-js**: https://apvarun.github.io/toastify-js/
  ```bash
  npm install toastify-js
  ```
- **notyf**: https://github.com/caroso1222/notyf
  ```bash
  npm install notyf
  ```

## 🎯 Best Practices

1. **Always show toast for user actions**
   - Success: Confirm action completed
   - Error: Inform what went wrong
   - Warning: Alert about important info

2. **Keep messages short and clear**
   - Max 2-3 lines
   - Use simple language
   - Include relevant numbers (amounts, counts)

3. **Use appropriate duration**
   - Success: 3000ms (3 seconds)
   - Error: 5000ms (5 seconds)
   - Warning: 5000ms (5 seconds)
   - Info: 3000ms (3 seconds)

4. **Don't overuse toasts**
   - Not every API call needs toast
   - Group related notifications
   - Avoid toast spam

5. **Make toasts accessible**
   - Use ARIA labels
   - Support keyboard navigation
   - Ensure color contrast for readability
