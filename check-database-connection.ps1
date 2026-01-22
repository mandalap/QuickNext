# Quick Database Connection Check Script (Windows PowerShell)

Write-Host "🔍 Checking Database Connection..." -ForegroundColor Cyan
Write-Host ""

# Check if MySQL service is running
Write-Host "=== STEP 1: Check MySQL Service ===" -ForegroundColor Yellow
$mysqlServices = Get-Service -Name MySQL* -ErrorAction SilentlyContinue

if ($mysqlServices) {
    foreach ($service in $mysqlServices) {
        Write-Host "Service: $($service.Name) - Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Red' })
        
        if ($service.Status -ne 'Running') {
            Write-Host "⚠️  MySQL service is not running!" -ForegroundColor Red
            $start = Read-Host "Do you want to start it? (y/n)"
            if ($start -eq 'y') {
                Start-Service -Name $service.Name
                Write-Host "✅ Service started!" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "❌ No MySQL service found!" -ForegroundColor Red
    Write-Host "Please install MySQL or start XAMPP/WAMP MySQL service" -ForegroundColor Yellow
}

Write-Host ""

# Check port 3306
Write-Host "=== STEP 2: Check Port 3306 ===" -ForegroundColor Yellow
$port3306 = Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue

if ($port3306) {
    Write-Host "✅ Port 3306 is in use (MySQL is likely running)" -ForegroundColor Green
} else {
    Write-Host "❌ Port 3306 is not in use (MySQL is not running)" -ForegroundColor Red
}

Write-Host ""

# Check .env file
Write-Host "=== STEP 3: Check .env Configuration ===" -ForegroundColor Yellow
$envPath = "app\backend\.env"

if (Test-Path $envPath) {
    Write-Host "✅ .env file found" -ForegroundColor Green
    
    $envContent = Get-Content $envPath
    $dbConnection = ($envContent | Select-String "DB_CONNECTION=").ToString().Split('=')[1]
    $dbHost = ($envContent | Select-String "DB_HOST=").ToString().Split('=')[1]
    $dbPort = ($envContent | Select-String "DB_PORT=").ToString().Split('=')[1]
    $dbDatabase = ($envContent | Select-String "DB_DATABASE=").ToString().Split('=')[1]
    $dbUsername = ($envContent | Select-String "DB_USERNAME=").ToString().Split('=')[1]
    
    Write-Host "DB_CONNECTION: $dbConnection" -ForegroundColor Cyan
    Write-Host "DB_HOST: $dbHost" -ForegroundColor Cyan
    Write-Host "DB_PORT: $dbPort" -ForegroundColor Cyan
    Write-Host "DB_DATABASE: $dbDatabase" -ForegroundColor Cyan
    Write-Host "DB_USERNAME: $dbUsername" -ForegroundColor Cyan
    Write-Host "DB_PASSWORD: [hidden]" -ForegroundColor Cyan
    
    if ($dbConnection -ne "mysql") {
        Write-Host "⚠️  DB_CONNECTION is not 'mysql'" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env file not found at: $envPath" -ForegroundColor Red
    Write-Host "Please create .env file from .env.example" -ForegroundColor Yellow
}

Write-Host ""

# Test MySQL connection
Write-Host "=== STEP 4: Test MySQL Connection ===" -ForegroundColor Yellow
$testConnection = Read-Host "Do you want to test MySQL connection? (y/n)"

if ($testConnection -eq 'y') {
    $mysqlPath = "mysql"
    
    # Try to find MySQL in common locations
    $commonPaths = @(
        "C:\xampp\mysql\bin\mysql.exe",
        "C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MariaDB\bin\mysql.exe"
    )
    
    $mysqlFound = $false
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $mysqlPath = $path
            $mysqlFound = $true
            Write-Host "✅ Found MySQL at: $path" -ForegroundColor Green
            break
        }
    }
    
    if (-not $mysqlFound) {
        Write-Host "⚠️  MySQL executable not found in common locations" -ForegroundColor Yellow
        Write-Host "Please ensure MySQL is in your PATH or provide full path" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Testing connection..." -ForegroundColor Cyan
    Write-Host "If prompted, enter your MySQL root password" -ForegroundColor Yellow
    
    try {
        $result = & $mysqlPath -u root -p -e "SHOW DATABASES;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MySQL connection successful!" -ForegroundColor Green
            Write-Host $result
        } else {
            Write-Host "❌ MySQL connection failed!" -ForegroundColor Red
            Write-Host $result
        }
    } catch {
        Write-Host "❌ Error testing MySQL connection: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== STEP 5: Clear Laravel Cache ===" -ForegroundColor Yellow
$clearCache = Read-Host "Do you want to clear Laravel cache? (y/n)"

if ($clearCache -eq 'y') {
    Push-Location "app\backend"
    
    try {
        Write-Host "Clearing config cache..." -ForegroundColor Cyan
        php artisan config:clear
        Write-Host "Clearing application cache..." -ForegroundColor Cyan
        php artisan cache:clear
        Write-Host "Clearing route cache..." -ForegroundColor Cyan
        php artisan route:clear
        Write-Host "Clearing view cache..." -ForegroundColor Cyan
        php artisan view:clear
        Write-Host "✅ Cache cleared!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error clearing cache: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Yellow
Write-Host "1. Check if MySQL service is running" -ForegroundColor Cyan
Write-Host "2. Check if port 3306 is open" -ForegroundColor Cyan
Write-Host "3. Verify .env configuration" -ForegroundColor Cyan
Write-Host "4. Test MySQL connection" -ForegroundColor Cyan
Write-Host "5. Clear Laravel cache" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more details, see: FIX_DATABASE_CONNECTION.md" -ForegroundColor Green
