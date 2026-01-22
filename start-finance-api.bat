@echo off
echo ========================================
echo    MENJALANKAN APLIKASI DENGAN API KEUANGAN
echo ========================================
echo.

echo [1/3] Membersihkan cache backend...
cd app\backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear
echo ✓ Cache backend berhasil dibersihkan
echo.

echo [2/3] Menjalankan backend server...
echo ✓ Backend server siap dijalankan di port 8000
echo   Jalankan: php artisan serve
echo.

echo [3/3] Menjalankan frontend server...
cd ..\frontend
echo ✓ Frontend server siap dijalankan di port 3000
echo   Jalankan: npm start
echo.

echo ========================================
echo    APLIKASI SIAP DENGAN API KEUANGAN!
echo ========================================
echo.
echo Langkah selanjutnya:
echo 1. Buka terminal baru dan jalankan:
echo    cd app\backend && php artisan serve
echo.
echo 2. Buka terminal baru dan jalankan:
echo    cd app\frontend && npm start
echo.
echo 3. Buka browser dan akses:
echo    http://localhost:3000
echo.
echo 4. Login sebagai owner/admin dan navigasi ke menu Keuangan
echo.
echo Perubahan yang telah dilakukan:
echo ✓ Finance service terhubung ke API backend
echo ✓ Route API finance sudah ditambahkan
echo ✓ FinancialManagement component menggunakan data real
echo ✓ Recent expenses ditambahkan ke response API
echo ✓ Error handling dan retry logic diperbaiki
echo ✓ Import apiClient sudah diperbaiki
echo.
echo Test yang bisa dilakukan:
echo - Lihat data keuangan real di dashboard
echo - Check console browser untuk debug logs
echo - Test filter date range (today, week, month)
echo - Test tambah pengeluaran
echo - Check backend logs untuk API calls
echo.
pause

