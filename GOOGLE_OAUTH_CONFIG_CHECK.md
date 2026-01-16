# 🔍 Google OAuth Configuration Check

## 📋 Konfigurasi Saat Ini

### Authorized JavaScript origins
1. ✅ `https://app.quickkasir.com` - **BENAR** (Frontend app)
2. ✅ `https://quickkasir.com` - **BENAR** (Domain utama)
3. ❌ `https://api.quickkasir.com` - **TIDAK PERLU** (Backend API tidak menjalankan JavaScript OAuth)

### Authorized redirect URIs
1. ✅ `https://api.quickkasir.com/auth/google/callback` - **BENAR** (Backend callback endpoint)

---

## ✅ Analisis

### Yang Benar:
- ✅ `https://app.quickkasir.com` - Frontend app yang menjalankan OAuth flow
- ✅ `https://quickkasir.com` - Domain utama (jika landing page punya tombol login)
- ✅ `https://api.quickkasir.com/auth/google/callback` - Backend callback endpoint

### Yang Perlu Diperbaiki:
- ❌ **Hapus** `https://api.quickkasir.com` dari JavaScript origins (tidak perlu)
- ⚠️ **Pertimbangkan** tambahkan `https://www.quickkasir.com` jika landing page punya tombol login Google

---

## 🔧 Rekomendasi Konfigurasi

### Authorized JavaScript origins (Untuk Production)
```
https://app.quickkasir.com
https://www.quickkasir.com
https://quickkasir.com
```

**Catatan:**
- JavaScript origins adalah domain yang **menjalankan** OAuth flow (frontend)
- Backend API (`api.quickkasir.com`) **TIDAK** perlu karena tidak menjalankan JavaScript

### Authorized redirect URIs (Untuk Production)
```
https://api.quickkasir.com/auth/google/callback
```

**Catatan:**
- Redirect URI adalah endpoint di **backend** yang menerima callback dari Google
- Harus sesuai dengan `GOOGLE_REDIRECT_URI` di backend `.env`

---

## 🔍 Verifikasi Backend Configuration

### 1. Cek Backend .env

Di VPS, jalankan:

```bash
cd /var/www/quickkasir/app/backend
grep GOOGLE .env
```

**Harus ada:**
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://api.quickkasir.com/auth/google/callback
FRONTEND_URL=https://app.quickkasir.com
```

### 2. Cek Frontend .env

Di VPS, jalankan:

```bash
cd /var/www/quickkasir/app/frontend
grep REACT_APP_BACKEND_URL .env.production
```

**Harus ada:**
```env
REACT_APP_BACKEND_URL=https://api.quickkasir.com
```

---

## 📝 Checklist

- [ ] Hapus `https://api.quickkasir.com` dari JavaScript origins
- [ ] Pastikan `https://app.quickkasir.com` ada di JavaScript origins
- [ ] Pastikan `https://api.quickkasir.com/auth/google/callback` ada di Redirect URIs
- [ ] Cek backend `.env` - `GOOGLE_REDIRECT_URI` harus `https://api.quickkasir.com/auth/google/callback`
- [ ] Cek frontend `.env.production` - `REACT_APP_BACKEND_URL` harus `https://api.quickkasir.com`
- [ ] Test login dengan Google di `https://app.quickkasir.com/login`

---

## 🧪 Testing

### Test di Browser

1. Buka: `https://app.quickkasir.com/login`
2. Klik tombol "Lanjutkan dengan Google"
3. Harus redirect ke Google OAuth consent screen
4. Setelah login, harus redirect kembali ke `https://app.quickkasir.com/login/sso?token=...`

### Jika Error "Redirect URI mismatch"

1. Pastikan redirect URI di Google Cloud Console **PERSIS** sama dengan `GOOGLE_REDIRECT_URI` di backend `.env`
2. Pastikan tidak ada trailing slash (`/`) di akhir
3. Pastikan menggunakan `https://` (bukan `http://`)

---

## 🔐 Security Notes

1. **Jangan** expose `GOOGLE_CLIENT_SECRET` di public
2. **Jangan** commit `.env` file ke git
3. **Regenerate** credentials jika ter-expose
4. **Gunakan** HTTPS untuk semua production URLs

---

## 📚 Reference

- **Google OAuth Documentation:** https://developers.google.com/identity/protocols/oauth2
- **Laravel Socialite:** https://laravel.com/docs/socialite
- **OAuth 2.0 Playground:** https://developers.google.com/oauthplayground
