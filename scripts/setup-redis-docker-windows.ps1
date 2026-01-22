# QuickKasir - Complete Redis Docker Setup untuk Windows
# Script ini akan setup Redis dari awal sampai terhubung dengan Laravel

Write-Host "🚀 QuickKasir - Redis Docker Setup (Windows)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Gray

$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "❌ Docker tidak terinstall!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "   https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Docker terdeteksi!" -ForegroundColor Green

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker tidak berjalan!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Start Docker Desktop terlebih dahulu" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Docker sedang berjalan" -ForegroundColor Green
Write-Host ""

# Step 2: Start Redis Container
Write-Host "Step 2: Starting Redis Container..." -ForegroundColor Yellow
Write-Host "-------------------------------------" -ForegroundColor Gray

$existingContainer = docker ps -a --filter "name=quickkasir-redis" --format "{{.Names}}" 2>&1

if ($existingContainer -eq "quickkasir-redis") {
    Write-Host "📦 Container Redis sudah ada, checking status..." -ForegroundColor Yellow
    
    $running = docker ps --filter "name=quickkasir-redis" --format "{{.Names}}" 2>&1
    
    if ($running -eq "quickkasir-redis") {
        Write-Host "✅ Redis container sudah berjalan!" -ForegroundColor Green
    } else {
        Write-Host "🔄 Starting existing Redis container..." -ForegroundColor Yellow
        docker start quickkasir-redis 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Redis started successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to start Redis container" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "📦 Creating new Redis container..." -ForegroundColor Yellow
    docker run -d `
        --name quickkasir-redis `
        -p 6379:6379 `
        --restart unless-stopped `
        redis:7-alpine `
        redis-server --appendonly yes 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis container created and started!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create Redis container" -ForegroundColor Red
        Write-Host "   Error output: $($dockerOutput)" -ForegroundColor Gray
        exit 1
    }
}

# Wait for Redis to be ready
Write-Host "⏳ Waiting for Redis to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test Redis connection
$testResult = docker exec quickkasir-redis redis-cli ping 2>&1

if ($testResult -match "PONG") {
    Write-Host "✅ Redis is running and responding!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis container started but not responding yet" -ForegroundColor Yellow
    Write-Host "   Wait a few seconds and test manually:" -ForegroundColor Yellow
    Write-Host "   docker exec quickkasir-redis redis-cli ping" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Setup .env Configuration
Write-Host "Step 3: Configuring Laravel .env..." -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Gray

$envFile = "app\backend\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Create .env file first:" -ForegroundColor Yellow
    Write-Host "   cd app\backend" -ForegroundColor Gray
    Write-Host "   copy .env.example .env" -ForegroundColor Gray
    Write-Host "   php artisan key:generate" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green

# Backup .env
$backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $envFile $backupFile -ErrorAction SilentlyContinue
Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green

# Read and update .env
$content = Get-Content $envFile -Raw

# Update or add Redis configuration
$redisConfig = @"

# Redis Configuration (Docker)
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null
REDIS_DB=0
REDIS_CACHE_DB=1

# Cache using Redis
CACHE_STORE=redis
CACHE_PREFIX=quickkasir-cache-

# Session using Redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

# Queue using Redis
QUEUE_CONNECTION=redis
"@

# Check if Redis config exists
if ($content -match "REDIS_CLIENT=") {
    Write-Host "⚠️  Redis config already exists, updating..." -ForegroundColor Yellow
    
    # Update existing values
    $content = $content -replace "REDIS_CLIENT=.*", "REDIS_CLIENT=predis"
    $content = $content -replace "REDIS_HOST=.*", "REDIS_HOST=127.0.0.1"
    $content = $content -replace "REDIS_PORT=.*", "REDIS_PORT=6379"
    $content = $content -replace "REDIS_PASSWORD=.*", "REDIS_PASSWORD=null"
    $content = $content -replace "REDIS_DB=.*", "REDIS_DB=0"
    $content = $content -replace "REDIS_CACHE_DB=.*", "REDIS_CACHE_DB=1"
    $content = $content -replace "CACHE_STORE=.*", "CACHE_STORE=redis"
    $content = $content -replace "SESSION_DRIVER=.*", "SESSION_DRIVER=redis"
    $content = $content -replace "QUEUE_CONNECTION=.*", "QUEUE_CONNECTION=redis"
} else {
    Write-Host "✅ Adding Redis configuration..." -ForegroundColor Green
    $content += $redisConfig
}

# Write back to .env
Set-Content -Path $envFile -Value $content -NoNewline
Write-Host "✅ .env file updated!" -ForegroundColor Green
Write-Host ""

# Step 4: Clear Laravel Config Cache
Write-Host "Step 4: Clearing Laravel Config Cache..." -ForegroundColor Yellow
Write-Host "------------------------------------------" -ForegroundColor Gray

$originalLocation = Get-Location
Set-Location "app\backend"

try {
    php artisan config:clear 2>&1 | Out-Null
    php artisan cache:clear 2>&1 | Out-Null
    Write-Host "✅ Config cache cleared!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not clear cache (might need to run manually)" -ForegroundColor Yellow
}

Set-Location $originalLocation
Write-Host ""

# Step 5: Test Laravel Connection
Write-Host "Step 5: Testing Laravel Redis Connection..." -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray

Set-Location "app\backend"

$testCommand = "Cache::put('quickkasir_test', 'success', 60); echo Cache::get('quickkasir_test');"
$laravelTest = php artisan tinker --execute=$testCommand 2>&1

if ($laravelTest -match "success") {
    Write-Host "✅ Laravel successfully connected to Redis!" -ForegroundColor Green
    Write-Host ""
    
    # Clean up test key
    php artisan tinker --execute="Cache::forget('quickkasir_test');" 2>&1 | Out-Null
} else {
    Write-Host "⚠️  Laravel connection test failed" -ForegroundColor Yellow
    Write-Host "   Output: $laravelTest" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Try manually:" -ForegroundColor Yellow
    Write-Host "   php artisan tinker" -ForegroundColor Gray
    Write-Host "   Cache::put('test', 'value', 60);" -ForegroundColor Gray
    Write-Host "   Cache::get('test');" -ForegroundColor Gray
}

Set-Location $originalLocation
Write-Host ""

# Summary
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Redis Configuration:" -ForegroundColor Cyan
Write-Host "  Container: quickkasir-redis" -ForegroundColor White
Write-Host "  Host: 127.0.0.1" -ForegroundColor White
Write-Host "  Port: 6379" -ForegroundColor White
Write-Host "  Password: (none)" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "  Stop Redis:    docker stop quickkasir-redis" -ForegroundColor Gray
Write-Host "  Start Redis:   docker start quickkasir-redis" -ForegroundColor Gray
Write-Host "  Remove Redis:  docker rm -f quickkasir-redis" -ForegroundColor Gray
Write-Host "  View Logs:     docker logs quickkasir-redis" -ForegroundColor Gray
Write-Host "  Redis CLI:     docker exec -it quickkasir-redis redis-cli" -ForegroundColor Gray
Write-Host ""
Write-Host "Test Connection:" -ForegroundColor Cyan
Write-Host "  .\scripts\test-redis.ps1" -ForegroundColor Gray
Write-Host ""
