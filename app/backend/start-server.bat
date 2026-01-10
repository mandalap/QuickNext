@echo off
REM Script untuk start Laravel server dengan error handling

echo Checking Laravel installation...
cd /d "E:\development\kasir-pos-system\app\backend"

if not exist artisan (
    echo ERROR: artisan file not found!
    echo Please run this script from: E:\development\kasir-pos-system\app\backend
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting Laravel Development Server
echo ========================================
echo.
echo Clearing cache...
php artisan optimize:clear

echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop
echo.

php artisan serve --host=127.0.0.1 --port=8000

pause
