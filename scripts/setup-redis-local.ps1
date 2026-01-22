# QuickKasir - Redis Setup Script untuk Local Windows
# Script ini akan update .env dengan konfigurasi Redis

Write-Host "🚀 QuickKasir - Redis Local Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$envFile = "app\backend\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found at: $envFile" -ForegroundColor Red
    Write-Host "💡 Please create .env file first: cp app\backend\.env.example app\backend\.env" -ForegroundColor Yellow
    exit 1
}

Write-Host "📝 Updating .env file..." -ForegroundColor Yellow

# Backup .env
$backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $envFile $backupFile
Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green

# Read current .env content
$content = Get-Content $envFile -Raw

# Check if Redis config already exists
if ($content -match "REDIS_CLIENT=") {
    Write-Host "⚠️  Redis config already exists in .env" -ForegroundColor Yellow
    Write-Host "   Updating existing values..." -ForegroundColor Yellow
    
    # Update existing values
    $content = $content -replace "CACHE_STORE=.*", "CACHE_STORE=redis"
    $content = $content -replace "SESSION_DRIVER=.*", "SESSION_DRIVER=redis"
    $content = $content -replace "QUEUE_CONNECTION=.*", "QUEUE_CONNECTION=redis"
} else {
    Write-Host "✅ Adding Redis configuration..." -ForegroundColor Green
    
    # Add Redis config at the end
    $redisConfig = @"

# Redis Configuration
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
    
    $content += $redisConfig
}

# Write back to .env
Set-Content -Path $envFile -Value $content -NoNewline

Write-Host ""
Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
Write-Host ""

# Clear and rebuild config
Write-Host "🔄 Clearing and rebuilding Laravel config..." -ForegroundColor Yellow
Set-Location "app\backend"
php artisan config:clear
php artisan cache:clear
php artisan config:cache

Write-Host ""
Write-Host "✅ Config cleared and cached!" -ForegroundColor Green
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Redis setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install Redis server (choose one):" -ForegroundColor White
Write-Host "   - Via WSL: wsl sudo apt install redis-server" -ForegroundColor Gray
Write-Host "   - Via Docker: docker run -d --name redis -p 6379:6379 redis:alpine" -ForegroundColor Gray
Write-Host "   - Via Memurai: https://www.memurai.com/" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start Redis server" -ForegroundColor White
Write-Host ""
Write-Host "3. Test connection:" -ForegroundColor White
Write-Host "   .\scripts\test-redis.ps1" -ForegroundColor Gray
Write-Host ""
