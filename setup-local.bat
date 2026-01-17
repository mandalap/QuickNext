@echo off
title QuickKasir Local Setup
color 0B

echo.
echo ========================================
echo    🚀 QUICKKASIR LOCAL SETUP
echo ========================================
echo.

REM Get current directory
set PROJECT_ROOT=%~dp0
set BACKEND_PATH=%PROJECT_ROOT%app\backend
set FRONTEND_PATH=%PROJECT_ROOT%app\frontend
set LANDING_PATH=%PROJECT_ROOT%app\beranda

echo 📁 Project Root: %PROJECT_ROOT%
echo.

REM Check prerequisites
echo === Checking Prerequisites ===
echo.

php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP not found! Please install PHP ^>= 8.2
    pause
    exit /b 1
) else (
    echo ✅ PHP installed
)

composer --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Composer not found! Please install Composer
    pause
    exit /b 1
) else (
    echo ✅ Composer installed
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js ^>= 18.x
    pause
    exit /b 1
) else (
    echo ✅ Node.js installed
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found!
    pause
    exit /b 1
) else (
    echo ✅ npm installed
)

echo.
echo === STEP 1: Setup Backend ===
echo.

cd /d "%BACKEND_PATH%"

REM Install Composer dependencies
echo Installing Composer dependencies...
call composer install
if %errorlevel% neq 0 (
    echo ❌ Composer install failed!
    pause
    exit /b 1
)

REM Check .env file
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo Creating .env file...
    (
        echo APP_NAME="QuickKasir POS System"
        echo APP_ENV=local
        echo APP_KEY=
        echo APP_DEBUG=true
        echo APP_URL=http://localhost:8000
        echo.
        echo DB_CONNECTION=sqlite
        echo DB_DATABASE=database/database.sqlite
        echo.
        echo FRONTEND_URL=http://localhost:3000
        echo LANDING_URL=http://localhost:3001
        echo.
        echo CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
    ) > .env
    echo ✅ .env file created
) else (
    echo ✅ .env file exists
)

REM Generate APP_KEY if not set
php artisan key:generate

REM Create SQLite database
if not exist "database\database.sqlite" (
    echo Creating SQLite database...
    type nul > database\database.sqlite
    echo ✅ SQLite database created
)

REM Run migrations
echo Running database migrations...
php artisan migrate --force

echo.
echo === STEP 2: Setup Frontend ===
echo.

cd /d "%FRONTEND_PATH%"

REM Install npm dependencies
echo Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed!
    pause
    exit /b 1
)

REM Check .env.local file
if not exist ".env.local" (
    echo ⚠️  .env.local file not found!
    echo Creating .env.local file...
    (
        echo REACT_APP_BACKEND_URL=http://localhost:8000
        echo REACT_APP_API_BASE_URL=http://localhost:8000/api
        echo REACT_APP_VAPID_PUBLIC_KEY=
    ) > .env.local
    echo ✅ .env.local file created
) else (
    echo ✅ .env.local file exists
)

echo.
echo === STEP 3: Setup Landing Page ===
echo.

cd /d "%LANDING_PATH%"

REM Install npm dependencies
echo Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ⚠️  npm install failed for landing page, but continuing...
)

REM Check .env.local file
if not exist ".env.local" (
    echo ⚠️  .env.local file not found!
    echo Creating .env.local file...
    (
        echo NODE_ENV=development
        echo NEXT_PUBLIC_API_URL=http://localhost:8000/api
        echo NEXT_PUBLIC_APP_URL=http://localhost:3000
        echo NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
    ) > .env.local
    echo ✅ .env.local file created
) else (
    echo ✅ .env.local file exists
)

echo.
echo ========================================
echo    ✅ SETUP COMPLETE!
echo ========================================
echo.
echo 📋 Next Steps:
echo.
echo 1. Start Backend:
echo    cd app\backend
echo    php artisan serve
echo.
echo 2. Start Frontend (new terminal):
echo    cd app\frontend
echo    npm start
echo.
echo 3. Start Landing (new terminal - optional):
echo    cd app\beranda
echo    npm run dev
echo.
echo Or use: start_servers.bat to start all services
echo.
pause
