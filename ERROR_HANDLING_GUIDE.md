# 🛡️ Error Handling Guide - Kasir POS System

## ✅ Dokumentasi Lengkap Error Handling

Dokumentasi ini mencakup semua error handling yang diimplementasikan di aplikasi QuickKasir POS System.

---

## 📋 Error Handling Components

### 1. **API Error Handling** ✅

**File: `app/frontend/src/utils/apiClient.js`**

**Fitur:**
- ✅ Request/Response interceptors
- ✅ Network error handling
- ✅ Timeout error handling
- ✅ 401 Unauthorized handling dengan token refresh
- ✅ 422 Validation error handling
- ✅ Error logging dengan level yang sesuai
- ✅ Request deduplication
- ✅ Cancelled request handling

**File: `app/frontend/src/utils/errorHandler.js`**

**Fitur:**
- ✅ Centralized error handling
- ✅ User-friendly error messages
- ✅ Network error detection
- ✅ Business ID error handling
- ✅ Validation error formatting

**File: `app/frontend/src/utils/errorHandlerUtils.js`** ✅ **NEW**

**Fitur:**
- ✅ Utility functions untuk error detection
- ✅ Error message formatting
- ✅ Retry logic dengan exponential backoff
- ✅ Timeout promise helpers

### 2. **Service Worker Error Handling** ✅

**File: `app/frontend/src/App.js`**

**Fitur:**
- ✅ Service worker registration error handling
- ✅ Timeout untuk registration (10 seconds)
- ✅ SecurityError handling
- ✅ TypeError handling
- ✅ Update error handling
- ✅ Graceful degradation (app tetap berjalan tanpa service worker)

### 3. **Offline Handling** ✅

**File: `app/frontend/src/components/pwa/OfflineIndicator.jsx`**
**File: `app/frontend/src/hooks/useOnlineStatus.js`**

**Fitur:**
- ✅ Online/offline status detection
- ✅ Visual indicator untuk offline mode
- ✅ Reconnection notification
- ✅ Badge indicator di corner

### 4. **Network Timeout** ✅

**File: `app/frontend/src/config/api.config.js`**

**Timeout Configuration:**
- ✅ Default: 8 seconds
- ✅ Short: 3 seconds (untuk quick requests)
- ✅ Long: 15 seconds (untuk heavy requests)

**File: `app/frontend/src/contexts/AuthContext.jsx`**

**Timeout Handling:**
- ✅ Outlet loading timeout: 8 seconds
- ✅ Business loading timeout: 10 seconds
- ✅ Subscription check timeout: 5 seconds

---

## 🔧 Error Handling Utilities

### **Error Detection Functions**

```javascript
import {
  isNetworkError,
  isTimeoutError,
  isCancelledError,
  getErrorMessage,
  logError,
  handleApiErrorWithRetry,
  withTimeout,
} from '../utils/errorHandlerUtils';

// Check error type
if (isNetworkError(error)) {
  // Handle network error
}

if (isTimeoutError(error)) {
  // Handle timeout
}

// Get user-friendly message
const message = getErrorMessage(error);

// Log error with context
logError(error, 'ComponentName');

// Retry with exponential backoff
const result = await handleApiErrorWithRetry(
  () => apiCall(),
  3, // max retries
  1000 // initial delay
);

// Add timeout to promise
const result = await withTimeout(
  apiCall(),
  8000, // 8 seconds
  'Request timeout'
);
```

---

## 📊 Error Types & Handling

### **1. Network Errors**

**Detection:**
- No response object
- Has request object
- Error code: `ECONNABORTED` atau message contains "timeout"/"Network Error"

**Handling:**
- Show user-friendly message
- Check internet connection
- Suggest retry
- Log in development only

**Example:**
```javascript
if (isNetworkError(error)) {
  toast.error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
}
```

### **2. Timeout Errors**

**Detection:**
- Error code: `ECONNABORTED`
- Message contains "timeout" atau "aborted"

**Handling:**
- Show timeout message
- Suggest retry
- Log in development only

**Example:**
```javascript
if (isTimeoutError(error)) {
  toast.error('Request timeout. Server mungkin sedang sibuk, silakan coba lagi.');
}
```

### **3. Validation Errors (422)**

**Detection:**
- Status: 422
- Response has `errors` object

**Handling:**
- Display validation errors
- Don't log as error (expected behavior)
- Show field-specific errors

**Example:**
```javascript
if (error.response?.status === 422) {
  const errors = error.response.data.errors;
  // Display errors to user
}
```

### **4. Authentication Errors (401)**

**Detection:**
- Status: 401

**Handling:**
- Try to refresh token
- If refresh fails, logout user
- Redirect to login

**Example:**
```javascript
// Already handled in apiClient.js interceptor
// Automatically tries to refresh token
```

### **5. Authorization Errors (403)**

**Detection:**
- Status: 403

**Handling:**
- Show permission denied message
- Don't retry (won't help)

**Example:**
```javascript
if (error.response?.status === 403) {
  toast.error('Anda tidak memiliki izin untuk melakukan aksi ini.');
}
```

### **6. Server Errors (500+)**

**Detection:**
- Status >= 500

**Handling:**
- Show generic error message
- Log error details
- Suggest retry later

**Example:**
```javascript
if (error.response?.status >= 500) {
  toast.error('Terjadi kesalahan pada server. Silakan coba lagi nanti.');
}
```

### **7. Cancelled Requests**

**Detection:**
- Message contains "cancelled"/"canceled"
- Error name: `CanceledError`
- `axios.isCancel(error)` returns true

**Handling:**
- Don't show error (intentional cancellation)
- Don't log as error
- Silently ignore

**Example:**
```javascript
if (isCancelledError(error)) {
  // Silently ignore
  return;
}
```

---

## 🚀 Best Practices

### **1. Always Use Try-Catch**

```javascript
try {
  const result = await apiCall();
  // Handle success
} catch (error) {
  // Handle error
  const message = getErrorMessage(error);
  toast.error(message);
}
```

### **2. Use Error Handler Utilities**

```javascript
import { getErrorMessage, logError } from '../utils/errorHandlerUtils';

try {
  await apiCall();
} catch (error) {
  logError(error, 'ComponentName');
  const message = getErrorMessage(error);
  if (message) {
    toast.error(message);
  }
}
```

### **3. Handle Network Errors Gracefully**

```javascript
try {
  await apiCall();
} catch (error) {
  if (isNetworkError(error)) {
    // Show offline indicator
    // Use cached data if available
    // Queue request for later
  }
}
```

### **4. Set Appropriate Timeouts**

```javascript
// Quick requests
const result = await withTimeout(
  apiCall(),
  3000, // 3 seconds
  'Request timeout'
);

// Heavy requests
const result = await withTimeout(
  apiCall(),
  15000, // 15 seconds
  'Request timeout'
);
```

### **5. Retry Logic for Transient Errors**

```javascript
import { handleApiErrorWithRetry } from '../utils/errorHandlerUtils';

const result = await handleApiErrorWithRetry(
  () => apiCall(),
  3, // max retries
  1000 // initial delay (exponential backoff)
);
```

---

## 📝 Error Handling Checklist

### **API Calls**

- [x] ✅ All API calls wrapped in try-catch
- [x] ✅ Network errors handled
- [x] ✅ Timeout errors handled
- [x] ✅ 401 errors handled (auto refresh token)
- [x] ✅ 422 errors handled (validation)
- [x] ✅ 403 errors handled (permission)
- [x] ✅ 500+ errors handled (server errors)
- [x] ✅ Cancelled requests ignored
- [x] ✅ Error messages user-friendly

### **Service Worker**

- [x] ✅ Registration errors handled
- [x] ✅ Timeout for registration (10s)
- [x] ✅ SecurityError handled
- [x] ✅ TypeError handled
- [x] ✅ Update errors handled
- [x] ✅ Graceful degradation

### **Offline Handling**

- [x] ✅ Online/offline detection
- [x] ✅ Visual indicators
- [x] ✅ Reconnection notification
- [x] ✅ Offline badge
- [x] ✅ Service worker offline support

### **Network Timeout**

- [x] ✅ Default timeout: 8 seconds
- [x] ✅ Short timeout: 3 seconds
- [x] ✅ Long timeout: 15 seconds
- [x] ✅ Outlet loading timeout: 8 seconds
- [x] ✅ Business loading timeout: 10 seconds

---

## 🔍 Testing Error Handling

### **1. Test Network Errors**

```javascript
// Disconnect internet
// Make API call
// Verify error handling works
```

### **2. Test Timeout**

```javascript
// Slow down network (Chrome DevTools > Network > Throttling)
// Make API call
// Verify timeout handling works
```

### **3. Test Offline Mode**

```javascript
// Go offline (Chrome DevTools > Network > Offline)
// Use app
// Verify offline indicators show
// Go online
// Verify reconnection notification
```

### **4. Test Service Worker Errors**

```javascript
// Block service worker file
// Reload app
// Verify graceful degradation
```

---

## 📚 Related Files

- API Client: `app/frontend/src/utils/apiClient.js`
- Error Handler: `app/frontend/src/utils/errorHandler.js`
- Error Utils: `app/frontend/src/utils/errorHandlerUtils.js` ✅ **NEW**
- API Config: `app/frontend/src/config/api.config.js`
- Service Worker: `app/frontend/public/service-worker.js`
- Offline Indicator: `app/frontend/src/components/pwa/OfflineIndicator.jsx`
- Online Status Hook: `app/frontend/src/hooks/useOnlineStatus.js`

---

## ✅ Summary

**Error Handling sudah lengkap dengan:**

1. ✅ **API Error Handling** - Comprehensive error handling untuk semua API calls
2. ✅ **Service Worker Errors** - Proper error handling dengan graceful degradation
3. ✅ **Network Timeout** - Reasonable timeouts untuk semua requests
4. ✅ **Offline Handling** - Visual indicators dan offline support
5. ✅ **Error Utilities** - Helper functions untuk error detection dan handling
6. ✅ **User-Friendly Messages** - Error messages yang mudah dipahami
7. ✅ **Error Logging** - Appropriate logging levels

**Semua error handling sudah diimplementasikan dan siap digunakan! 🎉**
