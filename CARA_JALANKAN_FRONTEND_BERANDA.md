# Cara Menjalankan Frontend dan Beranda Bersamaan

## ✅ Bisa Dijalankan Bersamaan!

Frontend (React) dan Beranda (Next.js) **BISA** dijalankan bersamaan karena menggunakan port yang berbeda:
- **Frontend**: `http://localhost:3000`
- **Beranda**: `http://localhost:3001`

## 🚀 Cara 1: Menggunakan Script (Recommended)

### Windows Batch (.bat)
```bash
# Double-click file ini atau jalankan di terminal:
start-frontend-beranda.bat
```

### Windows PowerShell (.ps1)
```powershell
# Jalankan di PowerShell:
.\start-frontend-beranda.ps1
```

## 🚀 Cara 2: Manual (Terminal Terpisah)

### Terminal 1 - Frontend
```bash
cd app/frontend
npm start
```
Frontend akan berjalan di: `http://localhost:3000`

### Terminal 2 - Beranda
```bash
cd app/beranda
npm run dev
```
Beranda akan berjalan di: `http://localhost:3001`

## 📋 Informasi Port

| Service | Port | URL | Framework |
|---------|------|-----|-----------|
| Frontend | 3000 | http://localhost:3000 | React (CRA) |
| Beranda | 3001 | http://localhost:3001 | Next.js 14 |

## 💡 Tips

1. **Pastikan port tidak digunakan**: Jika port 3000 atau 3001 sudah digunakan, hentikan proses yang menggunakan port tersebut terlebih dahulu.

2. **Cek port yang digunakan**:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   ```

3. **Hentikan server**: 
   - Tekan `Ctrl+C` di terminal masing-masing
   - Atau tutup window terminal

4. **Hot Reload**: Keduanya mendukung hot reload, jadi perubahan kode akan otomatis ter-refresh.

## 🔧 Troubleshooting

### Port sudah digunakan
```bash
# Windows - Cari dan kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error saat install dependencies
```bash
# Frontend
cd app/frontend
npm install

# Beranda
cd app/beranda
npm install
```

### Script tidak jalan
- Pastikan path di script sesuai dengan lokasi proyek Anda
- Edit file `.bat` atau `.ps1` dan sesuaikan path `PROJECT_ROOT` atau `$projectRoot`

## 📝 Catatan

- Frontend dan Beranda adalah aplikasi terpisah yang independen
- Tidak ada konflik karena port berbeda
- Bisa dijalankan bersamaan tanpa masalah
- Setiap aplikasi memiliki `node_modules` sendiri

