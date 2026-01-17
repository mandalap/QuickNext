@echo off
title Kasir POS System - Start Servers
color 0A

echo.
echo ========================================
echo    🚀 KASIR POS SYSTEM - START SERVERS
echo ========================================
echo.

REM Set path ke direktori proyek (auto-detect)
set PROJECT_ROOT=%~dp0
set BACKEND_PATH=%PROJECT_ROOT%app\backend
set FRONTEND_PATH=%PROJECT_ROOT%app\frontend
set LANDING_PATH=%PROJECT_ROOT%app\beranda

echo 📁 Project Root: %PROJECT_ROOT%
echo 📁 Backend Path: %BACKEND_PATH%
echo 📁 Frontend Path: %FRONTEND_PATH%
echo.

REM Cek apakah direktori ada
if not exist "%BACKEND_PATH%" (
    echo ❌ Direktori backend tidak ditemukan: %BACKEND_PATH%
    pause
    exit /b 1
)

if not exist "%FRONTEND_PATH%" (
    echo ❌ Direktori frontend tidak ditemukan: %FRONTEND_PATH%
    pause
    exit /b 1
)

echo 🔧 Memulai Backend Laravel...
echo    Command: php artisan serve --host=0.0.0.0 --port=8000
echo    URL: http://localhost:8000
echo.

REM Jalankan backend di window baru
start "Backend Laravel" cmd /k "cd /d %BACKEND_PATH% && php artisan serve --host=0.0.0.0 --port=8000"

echo ⏳ Menunggu backend startup...
timeout /t 5 /nobreak >nul

echo.
echo ⚛️ Memulai Frontend React...
echo    Command: npm start
echo    URL: http://localhost:3000
echo.

REM Jalankan frontend di window baru
start "Frontend React" cmd /k "cd /d %FRONTEND_PATH% && npm start"

echo.
echo ⏳ Menunggu frontend startup...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 Memulai Landing Page (Next.js)...
echo    Command: npm run dev
echo    URL: http://localhost:3001
echo.

REM Jalankan landing page di window baru (optional)
start "Landing Next.js" cmd /k "cd /d %LANDING_PATH% && npm run dev"

echo.
echo 🎉 Sistem Kasir POS berhasil dimulai!
echo ========================================
echo.
echo 🌐 Backend Laravel: http://localhost:8000
echo ⚛️ Frontend React: http://localhost:3000
echo 🌍 Landing Page: http://localhost:3001
echo 🧪 Test Connection: file:///%PROJECT_ROOT%/test_backend_connection.html
echo.
echo 💡 Tips:
echo    - Buka browser ke http://localhost:3000 untuk mengakses aplikasi
echo    - Buka http://localhost:8000 untuk mengakses API Laravel
echo    - Tutup window terminal untuk menghentikan server
echo    - Buka test_backend_connection.html untuk test koneksi
echo.
echo ⏳ Menunggu server startup...
timeout /t 10 /nobreak >nul

echo.
echo 🔍 Testing koneksi backend...
curl -s -o nul -w "Status: %%{http_code}" http://localhost:8000/api/v1/dashboard/stats
echo.
echo.

echo 🎯 Sistem siap digunakan!
echo    Buka http://localhost:3000 di browser untuk mulai menggunakan aplikasi
echo.
echo Tekan Enter untuk keluar...
pause >nul
