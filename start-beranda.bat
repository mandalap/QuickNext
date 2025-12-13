@echo off
title Beranda Landing Page - Next.js
color 0A

echo.
echo ========================================
echo    🚀 BERANDA LANDING PAGE - NEXT.JS
echo ========================================
echo.

REM Set path ke direktori beranda
set BERANDA_PATH=E:\development\kasir-pos-system\app\beranda

echo 📁 Beranda Path: %BERANDA_PATH%
echo.

REM Cek apakah direktori ada
if not exist "%BERANDA_PATH%" (
    echo ❌ Direktori beranda tidak ditemukan: %BERANDA_PATH%
    pause
    exit /b 1
)

echo ⚛️ Memulai Next.js Development Server...
echo    Command: npm run dev
echo    URL: http://localhost:3001
echo.

REM Jalankan beranda di window baru
start "Beranda Landing Page" cmd /k "cd /d %BERANDA_PATH% && npm run dev"

echo.
echo 🎉 Beranda Landing Page berhasil dimulai!
echo ========================================
echo.
echo 🌐 Beranda: http://localhost:3001
echo.
echo 💡 Tips:
echo    - Buka browser ke http://localhost:3001 untuk mengakses landing page
echo    - Tutup window terminal untuk menghentikan server
echo.
echo ⏳ Menunggu server startup...
timeout /t 5 /nobreak >nul

echo.
pause

