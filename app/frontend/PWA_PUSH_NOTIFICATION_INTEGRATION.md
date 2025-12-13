# 📱 PWA Push Notification Integration - Complete Guide

## ✅ Status: FULLY INTEGRATED

Push notification system sudah **FULLY INTEGRATED** dengan PWA dan role-based backend system.

---

## 🔧 Components

### 1. **Service Worker** ✅
**File:** `app/frontend/public/service-worker.js`

**Features:**
- ✅ Listen untuk incoming push messages (`push` event)
- ✅ Parse notification data dari backend
- ✅ Display notification dengan icon, badge, vibrate
- ✅ Handle notification click dengan role-based routing
- ✅ Handle notification close

**Notification Click Routing:**
```javascript
// Order notifications route berdasarkan role:
- Kitchen role → /kitchen
- Waiter role → /waiter  
- Kasir role → /pos
- Owner/Admin → /orders
```

### 2. **React Hook** ✅
**File:** `app/frontend/src/hooks/usePushNotification.js`

**Features:**
- ✅ Check browser support
- ✅ Request notification permission
- ✅ Subscribe/unsubscribe to push notifications
- ✅ Auto-check subscription status
- ✅ **Auto-subscribe after login** (if permission granted)

**Auto-Subscribe Logic:**
- Hanya auto-subscribe jika permission sudah `granted`
- Tidak prompt permission secara otomatis (user harus manual)
- Auto-subscribe setelah 2 detik login (non-blocking)

### 3. **UI Component** ✅
**File:** `app/frontend/src/components/notifications/PushNotificationSettings.jsx`

**Features:**
- ✅ Display permission status
- ✅ Display subscription status
- ✅ Button untuk enable/disable notifications
- ✅ Auto-subscribe setelah permission granted

### 4. **Backend Integration** ✅
**File:** `app/backend/app/Services/NotificationService.php`

**Features:**
- ✅ Role-based push notification sending
- ✅ Filter users berdasarkan role_targets
- ✅ Filter berdasarkan business/outlet access
- ✅ Auto-send push saat notification dibuat

---

## 🔄 Flow Diagram

### **1. User Login & Auto-Subscribe**
```
User Login
  ↓
AuthContext sets user & currentBusiness
  ↓
usePushNotification hook detects user + business
  ↓
Check if permission === 'granted' && !isSubscribed
  ↓
Auto-subscribe (after 2s delay, non-blocking)
  ↓
Subscription saved to backend
```

### **2. Order Created → Push Notification**
```
Order Created (POSController)
  ↓
AppNotification::create() dengan role_targets
  ↓
AppNotification observer triggered
  ↓
NotificationService::sendPushNotification()
  ↓
Get target users berdasarkan role_targets
  ↓
Filter by business/outlet access
  ↓
Send push ke semua user yang sesuai
  ↓
Service Worker receives push
  ↓
Display notification di device
```

### **3. User Clicks Notification**
```
User clicks notification
  ↓
Service Worker notificationclick event
  ↓
Parse notification data (type, resource_type, role)
  ↓
Route berdasarkan role:
  - Kitchen → /kitchen
  - Waiter → /waiter
  - Kasir → /pos
  - Owner/Admin → /orders
  ↓
Focus existing window atau open new window
```

---

## 📋 Role-Based Notification Routing

### **Order Notifications**

| Notification Type | Role | Route |
|------------------|------|-------|
| `order.created` | Kitchen | `/kitchen` |
| `order.created` | Waiter | `/waiter` |
| `order.created` | Kasir | `/pos` |
| `order.created` | Owner/Admin | `/orders` |
| `order.paid` | Kasir | `/pos` |
| `order.paid` | Owner/Admin | `/orders` |
| `order.status_changed` | Kitchen | `/kitchen` |
| `order.status_changed` | Waiter | `/waiter` |
| `order.status_changed` | Kasir | `/pos` |

### **Subscription Notifications**

| Notification Type | Route |
|------------------|-------|
| `subscription.expiring` | `/subscription-settings` |
| `subscription.expired` | `/subscription-settings` |

---

## 🔐 Security Features

### **1. VAPID Encryption** ✅
- Push notifications dienkripsi dengan VAPID keys
- Private key hanya di server
- Public key di frontend untuk subscription

### **2. Authentication Required** ✅
- Subscribe/unsubscribe memerlukan `auth:sanctum`
- User harus login untuk subscribe

### **3. Role-Based Filtering** ✅
- Backend hanya kirim push ke role yang sesuai
- Frontend route berdasarkan role saat click

### **4. Business/Outlet Access Control** ✅
- Push hanya ke user dengan akses business/outlet
- Filter di backend sebelum send

---

## 🚀 Setup Instructions

### **1. Generate VAPID Keys**

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

### **2. Set Environment Variables**

**Backend** (`app/backend/.env`):
```env
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@quickkasir.com
```

**Frontend** (`app/frontend/.env.local`):
```env
REACT_APP_VAPID_PUBLIC_KEY=your-public-key
```

### **3. Enable Push Notifications**

1. User login ke aplikasi
2. Go to Settings → Push Notifications
3. Click "Minta Izin Notifikasi"
4. Grant permission
5. Auto-subscribe akan terjadi

**OR**

1. User login
2. Jika permission sudah `granted`, auto-subscribe akan terjadi setelah 2 detik

---

## 📊 Notification Types

### **Order Created** (`order.created`)
- **Target Roles:** kitchen, waiter (jika dine_in), kasir (jika pending), owner, admin
- **Message:** "Order Baru: #ORDER_NUMBER"
- **Route on Click:** Based on role

### **Order Paid** (`order.paid`)
- **Target Roles:** kasir, owner, admin
- **Message:** "Pembayaran Selesai: #ORDER_NUMBER"
- **Route on Click:** `/pos` (kasir) atau `/orders` (owner/admin)

### **Order Status Changed** (`order.status_changed`)
- **Target Roles:** waiter (jika dine_in), kasir, owner, admin
- **Message:** "Status Order Diubah: #ORDER_NUMBER"
- **Route on Click:** Based on role

---

## ✅ Checklist

- [x] Service Worker push handler
- [x] Service Worker notification click handler
- [x] React hook untuk push notifications
- [x] UI component untuk settings
- [x] Auto-subscribe after login
- [x] Role-based routing on notification click
- [x] Backend role-based push sending
- [x] VAPID encryption
- [x] Authentication required
- [x] Business/outlet access control

---

## 🎯 Kesimpulan

**✅ Push Notification System FULLY INTEGRATED dengan PWA:**

1. **Service Worker** handle push messages dan routing
2. **React Hook** untuk subscribe/unsubscribe
3. **Auto-Subscribe** setelah login (jika permission granted)
4. **Role-Based Routing** saat notification clicked
5. **Backend Integration** dengan role-based system
6. **Security** dengan VAPID encryption dan access control

**Sistem siap digunakan!** 🚀

