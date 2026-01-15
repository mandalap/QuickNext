@echo off
title Kill Port 3001
color 0A

echo.
echo ========================================
echo    🛑 KILL PROCESS DI PORT 3001
echo ========================================
echo.

echo 🔍 Mencari proses yang menggunakan port 3001...
echo.

netstat -ano | findstr :3001

echo.
echo 🛑 Menghentikan semua proses Node.js yang menggunakan port 3001...
echo.

REM Kill semua proses node yang mungkin menggunakan port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Menghentikan PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo ⏳ Menunggu 2 detik...
timeout /t 2 /nobreak >nul

echo.
echo 🔍 Verifikasi port 3001...
netstat -ano | findstr :3001

if %errorlevel% == 0 (
    echo.
    echo ⚠️  Masih ada proses yang menggunakan port 3001
    echo    Jalankan script ini lagi atau restart komputer
) else (
    echo.
    echo ✅ Port 3001 sekarang tersedia!
)

echo.
pause
