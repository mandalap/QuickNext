# 🔧 Fix manifest.json 404 - VPS Steps

## ❌ Masalah

1. Git pull gagal karena ada local changes
2. File `manifest.json` tidak ditemukan di `public` folder

---

## ✅ Solusi

### STEP 1: Resolve Git Conflict

```bash
cd /var/www/quickkasir

# Opsi 1: Stash local changes (simpan perubahan lokal)
git stash

# Opsi 2: Reset local changes (hapus perubahan lokal, gunakan versi GitHub)
git checkout -- fix-manifest-json-vps.sh

# Pull lagi
git pull origin main
```

### STEP 2: Verifikasi File manifest.json

```bash
# Cek apakah file sudah ter-pull
ls -la app/frontend/public/manifest.json

# Jika tidak ada, pull lagi atau create manual
cd app/frontend/public

# Create file jika tidak ada
if [ ! -f manifest.json ]; then
    cat > manifest.json << 'EOF'
{
  "short_name": "QuickKasir",
  "name": "QuickKasir - Kasir POS System",
  "description": "Sistem POS Multi-Outlet untuk Restaurant & Retail",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "icon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "icon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "icon-48x48.png",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "icon-180x180.png",
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "scope": "/",
  "shortcuts": [
    {
      "name": "Kasir POS",
      "short_name": "POS",
      "description": "Buka POS untuk transaksi",
      "url": "/cashier/pos",
      "icons": [{ "src": "logo-qk.png", "sizes": "192x192" }]
    },
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "Lihat dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "logo-qk.png", "sizes": "192x192" }]
    }
  ],
  "categories": ["business", "productivity", "finance"],
  "screenshots": [],
  "prefer_related_applications": false
}
EOF
    echo "✅ manifest.json created"
fi
```

### STEP 3: Jalankan Script Fix

```bash
cd /var/www/quickkasir

# Pastikan script executable
chmod +x fix-manifest-json-vps.sh

# Jalankan script
./fix-manifest-json-vps.sh
```

---

## 🚀 Quick Fix (All-in-One)

```bash
cd /var/www/quickkasir

# 1. Fix git conflict
git checkout -- fix-manifest-json-vps.sh
git pull origin main

# 2. Create manifest.json if missing
cd app/frontend/public
if [ ! -f manifest.json ]; then
    cat > manifest.json << 'EOF'
{
  "short_name": "QuickKasir",
  "name": "QuickKasir - Kasir POS System",
  "description": "Sistem POS Multi-Outlet untuk Restaurant & Retail",
  "icons": [
    {"src": "favicon.ico", "sizes": "64x64 32x32 24x24 16x16", "type": "image/x-icon"},
    {"src": "icon-16x16.png", "sizes": "16x16", "type": "image/png"},
    {"src": "icon-32x32.png", "sizes": "32x32", "type": "image/png"},
    {"src": "icon-48x48.png", "sizes": "48x48", "type": "image/png"},
    {"src": "icon-72x72.png", "sizes": "72x72", "type": "image/png"},
    {"src": "icon-96x96.png", "sizes": "96x96", "type": "image/png"},
    {"src": "icon-144x144.png", "sizes": "144x144", "type": "image/png"},
    {"src": "icon-180x180.png", "sizes": "180x180", "type": "image/png", "purpose": "any"},
    {"src": "icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
    {"src": "icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "scope": "/",
  "shortcuts": [
    {"name": "Kasir POS", "short_name": "POS", "description": "Buka POS untuk transaksi", "url": "/cashier/pos", "icons": [{"src": "logo-qk.png", "sizes": "192x192"}]},
    {"name": "Dashboard", "short_name": "Dashboard", "description": "Lihat dashboard", "url": "/dashboard", "icons": [{"src": "logo-qk.png", "sizes": "192x192"}]}
  ],
  "categories": ["business", "productivity", "finance"],
  "screenshots": [],
  "prefer_related_applications": false
}
EOF
fi

# 3. Run fix script
cd /var/www/quickkasir
chmod +x fix-manifest-json-vps.sh
./fix-manifest-json-vps.sh
```
