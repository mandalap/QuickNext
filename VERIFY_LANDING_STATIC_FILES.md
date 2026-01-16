# ✅ Verifikasi Landing Page Static Files

## 📊 Status PM2

```
✅ quickkasir-landing: online (OK)
❌ quickkasir-frontend: errored (perlu di-fix)
❌ quickkasir-queue: errored (perlu di-fix)
```

---

## 🧪 Test Landing Page

### 1. Test di Browser

Buka: `https://www.quickkasir.com`

**Cek:**
- ✅ Halaman load dengan benar
- ✅ CSS ter-apply (tidak broken layout)
- ✅ JavaScript berfungsi (button bisa diklik)
- ✅ Fonts ter-load (text tidak broken)

### 2. Test dengan Developer Tools

1. Buka Developer Tools (F12)
2. Tab **Network**
3. Reload page (Ctrl+R atau F5)
4. Filter: **All** atau **JS/CSS**

**Expected:**
- ✅ Semua file di `/_next/static/` harus **status 200**
- ✅ Tidak ada file dengan status **404**
- ✅ MIME type harus benar (text/css, application/javascript, dll)

---

## 🔍 Jika Masih Ada Error

### Cek Nginx Error Log

```bash
sudo tail -20 /var/log/nginx/error.log
```

### Cek PM2 Logs

```bash
pm2 logs quickkasir-landing --lines 20 --nostream
```

### Cek Apakah Static Files Ada

```bash
# Cek struktur folder
ls -la /var/www/quickkasir/app/beranda/.next/static/

# Cek file CSS
find /var/www/quickkasir/app/beranda/.next/static -name "*.css" | head -3

# Cek file JS
find /var/www/quickkasir/app/beranda/.next/static -name "*.js" | head -3
```

### Test Static File Access

```bash
# Test apakah Nginx bisa serve static file
curl -I http://www.quickkasir.com/_next/static/css/app.css 2>&1 | head -5
```

**Expected:** HTTP 200 atau 404 (jika file tidak ada)

---

## 🔧 Fix Frontend & Queue (Jika Perlu)

### Fix Frontend

```bash
cd /var/www/quickkasir/app/frontend

# Cek apakah build ada
ls -la build/ | head -5

# Jika tidak ada, build
npm run build

# Restart PM2
pm2 restart quickkasir-frontend
```

### Fix Queue

```bash
cd /var/www/quickkasir/app/backend

# Cek queue config
pm2 info quickkasir-queue

# Restart queue
pm2 restart quickkasir-queue

# Atau hapus jika tidak diperlukan
pm2 delete quickkasir-queue
```

---

## ✅ Checklist

- [ ] Landing page load di browser
- [ ] CSS ter-apply (tidak broken)
- [ ] JavaScript berfungsi
- [ ] Tidak ada 404 error di Network tab
- [ ] Static files status 200

---

**Test di browser dan beri tahu hasilnya!**
