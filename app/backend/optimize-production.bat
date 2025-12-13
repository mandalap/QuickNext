@echo off
echo ========================================
echo  OPTIMIZING LARAVEL FOR PRODUCTION
echo ========================================

echo.
echo [1/6] Clearing all caches...
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

echo.
echo [2/6] Optimizing configuration...
php artisan config:cache

echo.
echo [3/6] Optimizing routes...
php artisan route:cache

echo.
echo [4/6] Optimizing views...
php artisan view:cache

echo.
echo [5/6] Optimizing Composer autoloader...
composer dump-autoload --optimize --no-dev

echo.
echo [6/6] Setting production environment...
php artisan env:set APP_ENV=production
php artisan env:set APP_DEBUG=false

echo.
echo ========================================
echo  OPTIMIZATION COMPLETE!
echo ========================================
echo.
echo Performance improvements applied:
echo - Configuration cached
echo - Routes cached
echo - Views cached
echo - Composer autoloader optimized
echo - Debug mode disabled
echo.
echo Your Laravel application is now optimized for production!
echo.
pause
