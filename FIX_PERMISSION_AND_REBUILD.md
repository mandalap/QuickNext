# 🔧 Fix Permission Error & Rebuild Next.js

## ❌ Masalah

```
EACCES: permission denied, open '/var/www/quickkasir/app/beranda/.next/trace'
```

**Penyebab:** Folder `.next` atau parent folder tidak writable oleh user `mandala`.

---

## ✅ SOLUSI: Fix Permission & Rebuild

```bash
cd /var/www/quickkasir/app/beranda

# 1. Fix ownership ke user saat ini (mandala)
echo "=== Fixing Ownership ==="
sudo chown -R $USER:$USER /var/www/quickkasir/app/beranda

# 2. Fix permissions untuk build
echo ""
echo "=== Fixing Permissions ==="
sudo chmod -R 755 /var/www/quickkasir/app/beranda

# 3. Pastikan .next folder bisa di-write
echo ""
echo "=== Ensuring .next is writable ==="
rm -rf .next
mkdir -p .next
chmod -R 755 .next

# 4. Rebuild Next.js
echo ""
echo "=== Rebuilding Next.js ==="
npm run build

# 5. Setelah build, fix ownership untuk Nginx (www-data)
echo ""
echo "=== Fixing Ownership for Nginx ==="
sudo chown -R www-data:www-data .next
sudo chmod -R 755 .next

# 6. Restart PM2
echo ""
echo "=== Restarting PM2 ==="
pm2 restart quickkasir-landing

# 7. Verifikasi
echo ""
echo "=== Verification ==="
pm2 status | grep landing
sleep 3
curl -s http://127.0.0.1:3001 | grep -i "quickkasir" | head -3
```

---

## 📝 Penjelasan

1. **Build time:** User `mandala` perlu write access ke folder `.next`
2. **Runtime:** Nginx (www-data) perlu read access ke folder `.next`

**Solusi:** 
- Build dengan ownership `mandala:mandala`
- Setelah build, ubah ownership ke `www-data:www-data` untuk Nginx

---

**Jalankan command di atas untuk fix permission dan rebuild!**
