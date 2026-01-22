# Beranda Landing Page - Next.js

Landing page untuk aplikasi Kasir POS System menggunakan Next.js 14.

## 🚀 Cara Menjalankan

### Opsi 1: Menggunakan Script (Recommended)

**Windows (Batch):**
```bash
start-beranda.bat
```

**Windows (PowerShell):**
```powershell
.\start-beranda.ps1
```

### Opsi 2: Manual

1. Masuk ke direktori beranda:
```bash
cd app/beranda
```

2. Install dependencies (jika belum):
```bash
npm install
```

3. Jalankan development server:
```bash
npm run dev
```

4. Buka browser dan akses:
```
http://localhost:3001
```

## 📋 Scripts Tersedia

- `npm run dev` - Menjalankan development server di port 3001
- `npm run build` - Build untuk production
- `npm start` - Menjalankan production server

## ⚙️ Konfigurasi

- **Port:** 3001 (untuk menghindari konflik dengan frontend React di port 3000)
- **Framework:** Next.js 14.2.3
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + shadcn/ui

## 📁 Struktur Proyek

```
app/beranda/
├── app/              # Next.js App Router
│   ├── page.js       # Landing page utama
│   ├── layout.js     # Root layout
│   └── globals.css   # Global styles
├── components/       # React components
│   └── ui/          # UI components (shadcn/ui)
├── lib/             # Utility functions
├── public/          # Static files
└── package.json     # Dependencies

```

## 🎨 Fitur

- ✅ Responsive design
- ✅ Dark mode support
- ✅ Animasi dengan Framer Motion
- ✅ SEO optimized
- ✅ Fast loading
- ✅ Modern UI/UX

## 🔧 Troubleshooting

### Port sudah digunakan
Jika port 3001 sudah digunakan, ubah port di `package.json`:
```json
"dev": "next dev --port 3002"
```

### Dependencies error
Hapus `node_modules` dan `package-lock.json`, lalu install ulang:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build error
Pastikan semua dependencies terinstall:
```bash
npm install
```

## 📝 Catatan

- Landing page ini berjalan di port **3001** untuk menghindari konflik dengan frontend React yang berjalan di port 3000
- Pastikan tidak ada aplikasi lain yang menggunakan port 3001

