# 🧹 Panduan Build Cleanup - Kapan Perlu Hapus Build Folder?

## 📋 Quick Answer

**Biasanya TIDAK PERLU hapus build folder**, tapi ada beberapa kondisi yang perlu:

---

## ✅ Bisa Langsung Build (Tidak Perlu Hapus)

### React (Create React App)
```bash
cd app/frontend
npm run build
# ✅ Langsung build, folder build akan di-overwrite otomatis
```

### Next.js (Landing Page)
```bash
cd app/beranda
npm run build
# ✅ Langsung build, folder .next akan di-overwrite otomatis
```

**Kenapa tidak perlu?**
- Build tools (webpack, Next.js) akan overwrite file lama
- Cache management sudah otomatis
- Lebih cepat (tidak perlu hapus dulu)

---

## ⚠️ Perlu Hapus Build Jika:

### 1. Ada Error Build yang Aneh
```bash
# React
cd app/frontend
rm -rf build node_modules/.cache
npm install
npm run build

# Next.js
cd app/beranda
rm -rf .next node_modules/.cache
npm install
npm run build
```

### 2. Environment Variables Tidak Ter-update
```bash
# React
cd app/frontend
rm -rf build
# Update .env.production
npm run build

# Next.js
cd app/beranda
rm -rf .next
# Update .env.production
npm run build
```

### 3. Ada Masalah Cache
```bash
# React
cd app/frontend
rm -rf build
npm run build

# Next.js
cd app/beranda
rm -rf .next
npm run build
```

### 4. Setelah Update Dependencies
```bash
# React
cd app/frontend
rm -rf build node_modules
npm install
npm run build

# Next.js
cd app/beranda
rm -rf .next node_modules
npm install
npm run build
```

---

## 🔍 Cara Tahu Perlu Hapus atau Tidak?

### Test Build Dulu:
```bash
# Coba build langsung
npm run build

# Jika berhasil tanpa error → Tidak perlu hapus ✅
# Jika ada error aneh → Hapus build folder ⚠️
```

---

## 📝 Best Practice

### Development:
```bash
# Tidak perlu hapus, langsung build
npm run build
```

### Production (Setelah Update Code):
```bash
# Biasanya cukup build langsung
npm run build

# Tapi jika ada masalah, clear dulu
rm -rf build  # atau .next untuk Next.js
npm run build
```

### Production (Setelah Update Dependencies):
```bash
# Lebih aman clear semua
rm -rf build node_modules
npm install
npm run build
```

---

## 🎯 Untuk VPS QuickKasir

### Normal Build (Recommended):
```bash
# Frontend
cd /var/www/quickkasir/app/frontend
npm run build
pm2 restart quickkasir-frontend

# Landing
cd /var/www/quickkasir/app/beranda
npm run build
pm2 restart quickkasir-landing
```

### Jika Ada Masalah (Clear Build):
```bash
# Frontend
cd /var/www/quickkasir/app/frontend
rm -rf build
npm run build
pm2 restart quickkasir-frontend

# Landing
cd /var/www/quickkasir/app/beranda
rm -rf .next
npm run build
pm2 restart quickkasir-landing
```

---

## 💡 Tips

1. **Build langsung dulu** - Jika berhasil, tidak perlu hapus
2. **Hapus jika error** - Jika build error atau environment tidak ter-update
3. **Clear cache juga** - Jika masih error, hapus `node_modules/.cache` juga
4. **Full clean** - Jika masih error, hapus `node_modules` dan install ulang

---

## ✅ Kesimpulan

**Untuk kasus Anda (update environment variables):**

✅ **Bisa langsung build** - Environment variables akan ter-update
⚠️ **Hapus jika tidak ter-update** - Jika setelah build, env masih lama, baru hapus

**Command yang aman:**
```bash
# Coba build langsung dulu
npm run build

# Jika env tidak ter-update, baru hapus
rm -rf build  # atau .next
npm run build
```
