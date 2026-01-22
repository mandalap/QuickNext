# QuickKasir Local Setup Script (PowerShell)

Write-Host "🚀 QuickKasir Local Setup Script" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "=== Checking Prerequisites ===" -ForegroundColor Yellow

# Check PHP
$phpVersion = php -v 2>$null
if ($phpVersion) {
    Write-Host "✅ PHP installed" -ForegroundColor Green
} else {
    Write-Host "❌ PHP not found! Please install PHP >= 8.2" -ForegroundColor Red
    exit 1
}

# Check Composer
$composerVersion = composer --version 2>$null
if ($composerVersion) {
    Write-Host "✅ Composer installed" -ForegroundColor Green
} else {
    Write-Host "❌ Composer not found! Please install Composer" -ForegroundColor Red
    exit 1
}

# Check Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found! Please install Node.js >= 18.x" -ForegroundColor Red
    exit 1
}

# Check npm
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Setup Backend
Write-Host "=== STEP 1: Setup Backend ===" -ForegroundColor Yellow
Push-Location "app\backend"

# Install Composer dependencies
Write-Host "Installing Composer dependencies..." -ForegroundColor Cyan
composer install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Composer install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from template..." -ForegroundColor Cyan
    
    # Create basic .env
    @"
APP_NAME="QuickKasir POS System"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

FRONTEND_URL=http://localhost:3000
LANDING_URL=http://localhost:3001

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

# Generate APP_KEY if not set
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "APP_KEY=base64:") {
    Write-Host "Generating APP_KEY..." -ForegroundColor Cyan
    php artisan key:generate
}

# Create SQLite database if using SQLite
if ($envContent -match "DB_CONNECTION=sqlite") {
    $dbPath = "database/database.sqlite"
    if (-not (Test-Path $dbPath)) {
        Write-Host "Creating SQLite database..." -ForegroundColor Cyan
        New-Item -Path $dbPath -ItemType File -Force | Out-Null
        Write-Host "✅ SQLite database created" -ForegroundColor Green
    }
}

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Cyan
php artisan migrate --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration failed, but continuing..." -ForegroundColor Yellow
}

Pop-Location

# Setup Frontend
Write-Host ""
Write-Host "=== STEP 2: Setup Frontend ===" -ForegroundColor Yellow
Push-Location "app\frontend"

# Install npm dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Check .env.local file
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env.local..." -ForegroundColor Cyan
    
    @"
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_VAPID_PUBLIC_KEY=
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    
    Write-Host "✅ .env.local file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local file exists" -ForegroundColor Green
}

Pop-Location

# Setup Landing Page
Write-Host ""
Write-Host "=== STEP 3: Setup Landing Page ===" -ForegroundColor Yellow
Push-Location "app\beranda"

# Install npm dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  npm install failed for landing page, but continuing..." -ForegroundColor Yellow
}

# Check .env.local file
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env.local..." -ForegroundColor Cyan
    
    @"
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    
    Write-Host "✅ .env.local file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local file exists" -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start Backend:   cd app/backend && php artisan serve" -ForegroundColor White
Write-Host "2. Start Frontend:  cd app/frontend && npm start" -ForegroundColor White
Write-Host "3. Start Landing:   cd app/beranda && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use: start_servers.bat to start all services" -ForegroundColor Yellow
Write-Host ""
