@echo off
title Kasir POS System - Start Frontend & Beranda
color 0A

echo.
echo ========================================
echo    🚀 FRONTEND & BERANDA - START SERVERS
echo ========================================
echo.

REM Set path ke direktori proyek
set PROJECT_ROOT=E:\development\kasir-pos-system
set FRONTEND_PATH=%PROJECT_ROOT%\app\frontend
set BERANDA_PATH=%PROJECT_ROOT%\app\beranda

echo 📁 Project Root: %PROJECT_ROOT%
echo 📁 Frontend Path: %FRONTEND_PATH%
echo 📁 Beranda Path: %BERANDA_PATH%
echo.

REM Cek apakah direktori ada
if not exist "%FRONTEND_PATH%" (
    echo ❌ Direktori frontend tidak ditemukan: %FRONTEND_PATH%
    pause
    exit /b 1
)

if not exist "%BERANDA_PATH%" (
    echo ❌ Direktori beranda tidak ditemukan: %BERANDA_PATH%
    pause
    exit /b 1
)

echo ⚛️ Memulai Frontend React...
echo    Command: npm start
echo    URL: http://localhost:3000
echo.

REM Jalankan frontend di window baru
start "Frontend React" cmd /k "cd /d %FRONTEND_PATH% && npm start"

echo ⏳ Menunggu frontend startup...
timeout /t 3 /nobreak >nul

echo.
echo 🌐 Memulai Beranda Landing Page (Next.js)...
echo    Command: npm run dev
echo    URL: http://localhost:3001
echo.

REM Jalankan beranda di window baru
start "Beranda Landing Page" cmd /k "cd /d %BERANDA_PATH% && npm run dev"

echo.
echo 🎉 Frontend & Beranda berhasil dimulai!
echo ========================================
echo.
echo ⚛️ Frontend React: http://localhost:3000
echo 🌐 Beranda Landing: http://localhost:3001
echo.
echo 💡 Tips:
echo    - Buka browser ke http://localhost:3000 untuk mengakses aplikasi
echo    - Buka http://localhost:3001 untuk mengakses landing page
echo    - Tutup window terminal untuk menghentikan server
echo.
echo ⏳ Menunggu server startup...
timeout /t 10 /nobreak >nul

echo.
echo 🎯 Sistem siap digunakan!
echo    Frontend: http://localhost:3000
echo    Beranda: http://localhost:3001
echo.
echo Tekan Enter untuk keluar...
pause >nul

