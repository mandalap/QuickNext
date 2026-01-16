# 🧪 Test Next.js Sebelum Rebuild

## 🔍 Diagnosis

Sebelum rebuild, kita perlu cek apakah masalahnya di:
1. **Next.js server** (tidak merespons dengan benar)
2. **Nginx config** (tidak proxy dengan benar)
3. **Browser cache** (cache lama)

---

## ✅ Test Command

```bash
# 1. Test direct ke Next.js server
echo "=== Testing Next.js Direct (127.0.0.1:3001) ==="
curl -s http://127.0.0.1:3001 | head -50

# 2. Cek apakah ada "QuickKasir" di response
echo ""
echo "=== Checking for QuickKasir ==="
curl -s http://127.0.0.1:3001 | grep -i "quickkasir" | head -5

# 3. Cek apakah ada "Laravel" di response
echo ""
echo "=== Checking for Laravel ==="
curl -s http://127.0.0.1:3001 | grep -i "laravel" | head -5

# 4. Test melalui Nginx
echo ""
echo "=== Testing via Nginx (quickkasir.com) ==="
curl -s http://quickkasir.com | head -50

# 5. Cek response headers
echo ""
echo "=== Response Headers ==="
curl -I http://127.0.0.1:3001 2>&1 | head -10
curl -I http://quickkasir.com 2>&1 | head -10
```

---

## 📊 Analisis Hasil

### Jika Next.js Direct Return "Laravel":
- ❌ **Next.js server salah** → Perlu rebuild

### Jika Next.js Direct Return "QuickKasir" tapi Nginx Return "Laravel":
- ❌ **Nginx config salah** → Perlu fix Nginx, bukan rebuild

### Jika Next.js Direct Return "QuickKasir" dan Nginx Juga Return "QuickKasir":
- ✅ **Semua sudah benar** → Masalahnya di browser cache

---

## 🔧 Action Berdasarkan Hasil

### Scenario 1: Next.js Return "Laravel"
```bash
# Rebuild Next.js
cd /var/www/quickkasir/app/beranda
rm -rf .next
npm run build
pm2 restart quickkasir-landing
```

### Scenario 2: Next.js Return "QuickKasir" tapi Nginx Return "Laravel"
```bash
# Fix Nginx
sudo systemctl restart nginx
# Atau cek apakah ada config lain yang override
```

### Scenario 3: Semua Return "QuickKasir"
```bash
# Clear browser cache atau test di Incognito
# Masalahnya di browser cache, bukan server
```

---

**Jalankan test command di atas dulu sebelum rebuild!**
