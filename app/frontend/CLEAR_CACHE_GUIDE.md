# 🧹 Panduan Clear Cache

## 📋 Overview

Sistem sudah **otomatis clear cache** ketika detect business milik user lain. Tapi jika Anda ingin clear cache secara manual, berikut caranya:

---

## ✅ Clear Cache Otomatis

Sistem akan **otomatis clear cache** jika:
- ✅ Business di cache milik user lain (email berbeda)
- ✅ User logout
- ✅ Business ID tidak valid (tidak belong to user)

**Tidak perlu action manual** - sistem sudah handle ini!

---

## 🧹 Clear Cache Manual

### **Cara 1: Via Browser Console**

1. Buka **Browser Console** (F12 atau Ctrl+Shift+I)
2. Paste kode berikut:

```javascript
// Clear semua cache
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.removeItem('userId');
localStorage.removeItem('businesses');
localStorage.removeItem('currentBusiness');
localStorage.removeItem('currentBusinessId');
localStorage.removeItem('currentOutletId');
localStorage.removeItem('hasActiveSubscription');
localStorage.removeItem('skipSubscriptionCheck');

console.log('✅ Cache cleared!');
```

3. Tekan **Enter**
4. **Refresh halaman** (F5)

### **Cara 2: Via Browser DevTools**

1. Buka **Browser DevTools** (F12)
2. Pilih tab **Application** (Chrome) atau **Storage** (Firefox)
3. Klik **Local Storage** → `http://localhost:3000`
4. Klik kanan → **Clear** atau hapus item satu per satu
5. **Refresh halaman** (F5)

### **Cara 3: Clear All Browser Data**

1. Buka **Browser Settings**
2. Pilih **Privacy & Security** → **Clear browsing data**
3. Pilih **Cached images and files** dan **Cookies and other site data**
4. Klik **Clear data**
5. **Refresh halaman** (F5)

---

## 🔧 Clear Cache via Code (Developer)

Jika Anda developer dan ingin clear cache programmatically:

```javascript
// Clear semua cache
const clearAllCache = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  localStorage.removeItem('businesses');
  localStorage.removeItem('currentBusiness');
  localStorage.removeItem('currentBusinessId');
  localStorage.removeItem('currentOutletId');
  localStorage.removeItem('hasActiveSubscription');
  localStorage.removeItem('skipSubscriptionCheck');
  
  console.log('✅ All cache cleared');
};

// Clear cache business saja
const clearBusinessCache = () => {
  localStorage.removeItem('businesses');
  localStorage.removeItem('currentBusiness');
  localStorage.removeItem('currentBusinessId');
  localStorage.removeItem('currentOutletId');
  
  console.log('✅ Business cache cleared');
};

// Clear cache subscription saja
const clearSubscriptionCache = () => {
  localStorage.removeItem('hasActiveSubscription');
  localStorage.removeItem('skipSubscriptionCheck');
  
  console.log('✅ Subscription cache cleared');
};
```

---

## 📝 Item Cache yang Disimpan

Berikut adalah item cache yang disimpan di localStorage:

| Item | Deskripsi | Kapan Di-clear |
|------|-----------|----------------|
| `token` | Authentication token | Saat logout |
| `user` | User data (JSON) | Saat logout atau user berbeda |
| `userId` | User ID | Saat logout |
| `businesses` | List businesses (JSON) | Saat logout atau business milik user lain |
| `currentBusiness` | Current business (JSON) | Saat logout atau business milik user lain |
| `currentBusinessId` | Current business ID | Saat logout atau business milik user lain |
| `currentOutletId` | Current outlet ID | Saat logout atau business berubah |
| `hasActiveSubscription` | Subscription status | Saat logout |
| `skipSubscriptionCheck` | Flag untuk skip subscription check | Auto-clear setelah 15 detik |

---

## ⚠️ Warning yang Muncul

### **Warning: "Cached business belongs to different user"**

**Ini adalah warning normal** yang muncul ketika:
- User A login → Cache business User A
- User A logout
- User B login → Detect business User A di cache
- **Sistem otomatis clear cache** ✅

**Tidak perlu action** - sistem sudah handle ini!

### **Warning: "Some cached businesses belong to different user"**

**Ini juga warning normal** yang muncul ketika:
- Multiple businesses di cache milik user lain
- **Sistem otomatis clear semua** ✅

**Tidak perlu action** - sistem sudah handle ini!

---

## 🎯 Kapan Perlu Clear Cache Manual?

Clear cache manual hanya diperlukan jika:
- ⚠️ Warning terus muncul meskipun sudah logout/login
- ⚠️ Data tidak ter-update setelah perubahan
- ⚠️ Ada masalah dengan data yang di-cache
- ⚠️ Testing dengan user berbeda

---

## ✅ Best Practice

1. **Jangan clear cache secara manual** kecuali ada masalah
2. **Sistem sudah otomatis clear cache** ketika diperlukan
3. **Logout/login** biasanya sudah cukup untuk clear cache
4. **Clear cache manual** hanya untuk debugging/testing

---

## 🔗 Related Files

- `app/frontend/src/contexts/AuthContext.jsx`
  - `logout()` - Clear cache saat logout
  - Cache validation logic

- `app/frontend/src/utils/apiClient.js`
  - Request interceptor untuk business ID

