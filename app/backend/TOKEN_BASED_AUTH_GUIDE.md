# 🔐 Token-Based Authentication System

## 📋 Overview

Sistem saat ini sudah menggunakan **Laravel Sanctum** untuk token-based authentication. Sistem ini sudah cukup flexible, tapi bisa dibuat lebih flexible lagi dengan beberapa opsi.

---

## ✅ Sistem Saat Ini (Token-Based)

### 1. **Laravel Sanctum**
- ✅ Sudah menggunakan `HasApiTokens` trait
- ✅ Token dibuat saat registrasi: `$user->createToken('API Token')`
- ✅ Token dibuat saat login: `$user->createToken('API Token')`
- ✅ Token digunakan untuk autentikasi API requests

### 2. **Token Flow**
```
1. User Register/Login
   ↓
2. Backend create token: $user->createToken('API Token')
   ↓
3. Token dikirim ke frontend
   ↓
4. Frontend simpan token di localStorage
   ↓
5. Frontend kirim token di header: Authorization: Bearer {token}
   ↓
6. Backend verify token via Sanctum middleware
```

---

## 🚀 Opsi untuk Lebih Flexible

### Opsi 1: **Token dengan Expiry Time yang Dapat Dikonfigurasi**

**File**: `config/sanctum.php`

```php
'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 60 * 24 * 30), // 30 hari default
```

**Keuntungan**:
- Token bisa expire setelah waktu tertentu
- Lebih secure
- User perlu login ulang secara berkala

### Opsi 2: **Multiple Token per User (Device-based)**

**Contoh**:
```php
// Token untuk mobile app
$mobileToken = $user->createToken('Mobile App')->plainTextToken;

// Token untuk web app
$webToken = $user->createToken('Web App')->plainTextToken;

// Token untuk API integration
$apiToken = $user->createToken('API Integration')->plainTextToken;
```

**Keuntungan**:
- User bisa login dari multiple devices
- Bisa revoke token per device
- Lebih flexible untuk multi-platform

### Opsi 3: **Token dengan Permissions/Scopes**

**Contoh**:
```php
// Token dengan permission read-only
$readToken = $user->createToken('Read Only', ['read'])->plainTextToken;

// Token dengan permission full access
$fullToken = $user->createToken('Full Access', ['read', 'write', 'delete'])->plainTextToken;
```

**Keuntungan**:
- Fine-grained access control
- Token dengan permission terbatas
- Lebih secure untuk API integration

### Opsi 4: **Refresh Token System**

**Flow**:
```
1. User login → dapat access token (short-lived) + refresh token (long-lived)
2. Access token expire → gunakan refresh token untuk dapat access token baru
3. Refresh token expire → user perlu login ulang
```

**Keuntungan**:
- Access token lebih secure (short-lived)
- User tidak perlu login ulang terlalu sering
- Refresh token bisa di-revoke jika compromised

---

## 🔧 Implementasi: Token-Based yang Lebih Flexible

### 1. **Update AuthController untuk Multiple Token**

```php
public function login(Request $request)
{
    $request->validate([
        'email' => 'required|string|email',
        'password' => 'required|string',
        'device_name' => 'nullable|string|max:255', // Optional: device name
    ]);

    if (!Auth::attempt($request->only('email', 'password'))) {
        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    $user = Auth::user();
    
    // ✅ FIX: Create token with device name (more flexible)
    $deviceName = $request->device_name ?? 'Web Browser';
    $token = $user->createToken($deviceName)->plainTextToken;

    return response()->json([
        'user' => $user,
        'token' => $token,
        'token_type' => 'Bearer',
        'expires_at' => now()->addDays(30), // Optional: show expiry
    ]);
}
```

### 2. **Update Register untuk Token dengan Device**

```php
public function register(Request $request)
{
    // ... existing validation ...
    
    $user = User::create([...]);
    
    // ✅ FIX: Create token with device name
    $deviceName = $request->device_name ?? 'Web Browser';
    $token = $user->createToken($deviceName)->plainTextToken;

    return response()->json([
        'user' => $user,
        'token' => $token,
        'token_type' => 'Bearer',
        'expires_at' => now()->addDays(30),
    ], 201);
}
```

### 3. **Endpoint untuk List Tokens (User bisa lihat semua device)**

```php
public function tokens(Request $request)
{
    $user = $request->user();
    
    $tokens = $user->tokens()->get()->map(function ($token) {
        return [
            'id' => $token->id,
            'name' => $token->name,
            'last_used_at' => $token->last_used_at,
            'created_at' => $token->created_at,
        ];
    });

    return response()->json([
        'success' => true,
        'tokens' => $tokens,
    ]);
}
```

### 4. **Endpoint untuk Revoke Token (Logout dari device tertentu)**

```php
public function revokeToken(Request $request, $tokenId)
{
    $user = $request->user();
    
    // Revoke specific token
    $user->tokens()->where('id', $tokenId)->delete();

    return response()->json([
        'success' => true,
        'message' => 'Token revoked successfully',
    ]);
}

public function revokeAllTokens(Request $request)
{
    $user = $request->user();
    
    // Revoke all tokens except current
    $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

    return response()->json([
        'success' => true,
        'message' => 'All tokens revoked successfully',
    ]);
}
```

---

## 📝 Rekomendasi: Sistem Token yang Lebih Flexible

### **Opsi A: Simple Token (Current - Sudah Cukup Flexible)**
- ✅ Token dibuat saat login/register
- ✅ Token tidak expire (atau expire sangat lama)
- ✅ Simple dan mudah digunakan
- ✅ Cocok untuk web app

### **Opsi B: Token dengan Device Management**
- ✅ Token dengan device name
- ✅ User bisa lihat semua device yang login
- ✅ User bisa logout dari device tertentu
- ✅ Cocok untuk multi-device usage

### **Opsi C: Token dengan Refresh Token**
- ✅ Access token short-lived (15 menit)
- ✅ Refresh token long-lived (30 hari)
- ✅ Lebih secure
- ✅ Cocok untuk mobile app atau high-security apps

---

## 🎯 Rekomendasi untuk QuickKasir

**Saya rekomendasikan Opsi B: Token dengan Device Management**

**Alasan**:
1. ✅ Sudah cukup flexible untuk kebutuhan QuickKasir
2. ✅ User bisa login dari multiple devices (web, mobile, tablet)
3. ✅ User bisa manage device yang login
4. ✅ Tidak terlalu kompleks seperti refresh token
5. ✅ Masih simple untuk di-maintain

---

## 🔗 File yang Perlu Diubah

1. **`app/backend/app/Http/Controllers/Api/AuthController.php`**
   - Update `login()` untuk device name
   - Update `register()` untuk device name
   - Tambah `tokens()` untuk list tokens
   - Tambah `revokeToken()` untuk revoke token

2. **`app/backend/routes/api.php`**
   - Tambah route untuk tokens management

3. **`app/frontend/src/contexts/AuthContext.jsx`**
   - Update untuk handle device name
   - Update untuk handle token management

---

## 📌 Catatan Penting

1. **Token Storage**: Token disimpan di `personal_access_tokens` table
2. **Token Security**: Token di-hash di database, tapi plain text dikirim ke frontend
3. **Token Expiry**: Default tidak expire, bisa di-set di config
4. **Token Revocation**: Token bisa di-revoke kapan saja

---

## 🧪 Testing

### Test Case 1: Login dari Multiple Devices
1. Login dari Web Browser → dapat token 1
2. Login dari Mobile App → dapat token 2
3. **Expected**: Kedua token valid, user bisa akses dari kedua device

### Test Case 2: Revoke Token
1. User login dari 2 devices
2. User revoke token device 1
3. **Expected**: Device 1 tidak bisa akses lagi, Device 2 masih bisa

### Test Case 3: List Tokens
1. User login dari 3 devices
2. User call `/api/v1/user/tokens`
3. **Expected**: Return list 3 tokens dengan device name

---

## ✅ Checklist Implementasi

- [ ] Update `login()` untuk device name
- [ ] Update `register()` untuk device name
- [ ] Tambah endpoint `tokens()` untuk list tokens
- [ ] Tambah endpoint `revokeToken()` untuk revoke token
- [ ] Tambah endpoint `revokeAllTokens()` untuk revoke all
- [ ] Update frontend untuk handle device name
- [ ] Update frontend untuk token management UI
- [ ] Test multi-device login
- [ ] Test token revocation

