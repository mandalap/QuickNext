# Test Redis Connection (QuickKasir POS System)
# Script ini akan test koneksi Redis dan konfigurasi Laravel

Write-Host "🧪 QuickKasir - Redis Connection Test" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Redis Server Connection
Write-Host "Test 1: Redis Server Connection" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Gray

$redisTest = $null
try {
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        $redisTest = wsl redis-cli ping 2>&1
    } else {
        # Try direct connection (if Redis is running natively on Windows)
        $redisTest = redis-cli ping 2>&1
    }
    
    if ($redisTest -match "PONG") {
        Write-Host "✅ Redis server is running!" -ForegroundColor Green
        Write-Host "   Response: $redisTest" -ForegroundColor Gray
    } else {
        Write-Host "❌ Redis server is not responding" -ForegroundColor Red
        Write-Host "   Response: $redisTest" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 Tip: Make sure Redis is running:" -ForegroundColor Yellow
        Write-Host "   - WSL: wsl sudo service redis-server start" -ForegroundColor Gray
        Write-Host "   - Docker: docker start redis" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Cannot connect to Redis server" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Gray
}

Write-Host ""

# Test 2: Laravel Configuration
Write-Host "Test 2: Laravel Configuration" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Gray

$envFile = "app\backend\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Check CACHE_STORE
    if ($envContent -match "CACHE_STORE=redis") {
        Write-Host "✅ CACHE_STORE is set to redis" -ForegroundColor Green
    } else {
        Write-Host "⚠️  CACHE_STORE is not set to redis" -ForegroundColor Yellow
        Write-Host "   Current value: $($envContent | Select-String 'CACHE_STORE=.*')" -ForegroundColor Gray
    }
    
    # Check SESSION_DRIVER
    if ($envContent -match "SESSION_DRIVER=redis") {
        Write-Host "✅ SESSION_DRIVER is set to redis" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SESSION_DRIVER is not set to redis" -ForegroundColor Yellow
        Write-Host "   Current value: $($envContent | Select-String 'SESSION_DRIVER=.*')" -ForegroundColor Gray
    }
    
    # Check QUEUE_CONNECTION
    if ($envContent -match "QUEUE_CONNECTION=redis") {
        Write-Host "✅ QUEUE_CONNECTION is set to redis" -ForegroundColor Green
    } else {
        Write-Host "⚠️  QUEUE_CONNECTION is not set to redis" -ForegroundColor Yellow
        Write-Host "   Current value: $($envContent | Select-String 'QUEUE_CONNECTION=.*')" -ForegroundColor Gray
    }
    
    # Check REDIS_HOST
    if ($envContent -match "REDIS_HOST") {
        $redisHost = ($envContent | Select-String 'REDIS_HOST=(.+)').Matches.Groups[1].Value
        Write-Host "✅ REDIS_HOST is configured: $redisHost" -ForegroundColor Green
    } else {
        Write-Host "⚠️  REDIS_HOST is not configured" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env file not found at: $envFile" -ForegroundColor Red
}

Write-Host ""

# Test 3: Laravel Tinker Test (if possible)
Write-Host "Test 3: Laravel Cache Test" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Gray

$artisanPath = "app\backend\artisan"
if (Test-Path $artisanPath) {
    Write-Host "Running Laravel cache test..." -ForegroundColor Gray
    
    # Test cache via artisan
    $cacheTest = php artisan tinker --execute="Cache::put('test_redis_connection', 'success', 60); echo Cache::get('test_redis_connection');" 2>&1
    
    if ($cacheTest -match "success") {
        Write-Host "✅ Laravel cache is working with Redis!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Laravel cache test failed" -ForegroundColor Yellow
        Write-Host "   Output: $cacheTest" -ForegroundColor Gray
        Write-Host ""
        Write-Host "💡 Try running manually:" -ForegroundColor Yellow
        Write-Host "   php artisan tinker" -ForegroundColor Gray
        Write-Host "   Cache::put('test', 'value', 60);" -ForegroundColor Gray
        Write-Host "   Cache::get('test');" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Laravel artisan not found. Skipping Laravel test." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Cyan
Write-Host ""
