# QuickKasir - Start Redis via Docker (Windows)
# Script ini akan start Redis container untuk development

Write-Host "🚀 QuickKasir - Starting Redis via Docker" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "❌ Docker tidak terinstall!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opsi lain:" -ForegroundColor Yellow
    Write-Host "1. Install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "2. Install Redis via WSL: wsl sudo apt install redis-server" -ForegroundColor White
    Write-Host "3. Install Memurai (Windows Native): https://www.memurai.com/" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Docker detected!" -ForegroundColor Green
Write-Host ""

# Check if Redis container already exists
$existingContainer = docker ps -a --filter "name=redis" --format "{{.Names}}" 2>&1

if ($existingContainer -eq "redis") {
    Write-Host "📦 Redis container sudah ada, checking status..." -ForegroundColor Yellow
    
    $running = docker ps --filter "name=redis" --format "{{.Names}}" 2>&1
    
    if ($running -eq "redis") {
        Write-Host "✅ Redis sudah berjalan!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Test koneksi:" -ForegroundColor Cyan
        docker exec redis redis-cli ping
        Write-Host ""
        Write-Host "Redis running on: 127.0.0.1:6379" -ForegroundColor Green
        Write-Host ""
        Write-Host "Untuk stop Redis:" -ForegroundColor Yellow
        Write-Host "  docker stop redis" -ForegroundColor Gray
        Write-Host ""
        exit 0
    } else {
        Write-Host "🔄 Starting existing Redis container..." -ForegroundColor Yellow
        docker start redis 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Redis started successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to start Redis container" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "📦 Creating and starting Redis container..." -ForegroundColor Yellow
    docker run -d --name redis -p 6379:6379 redis:alpine 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis container created and started!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create Redis container" -ForegroundColor Red
        exit 1
    }
}

# Wait a moment for Redis to start
Start-Sleep -Seconds 2

# Test connection
Write-Host ""
Write-Host "🧪 Testing Redis connection..." -ForegroundColor Yellow
$testResult = docker exec redis redis-cli ping 2>&1

if ($testResult -eq "PONG") {
    Write-Host "✅ Redis is running and responding!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Redis Configuration:" -ForegroundColor Cyan
    Write-Host "  Host: 127.0.0.1" -ForegroundColor White
    Write-Host "  Port: 6379" -ForegroundColor White
    Write-Host "  Password: (none)" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Pastikan .env sudah di-set:" -ForegroundColor White
    Write-Host "   CACHE_STORE=redis" -ForegroundColor Gray
    Write-Host "   SESSION_DRIVER=redis" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Clear config cache:" -ForegroundColor White
    Write-Host "   cd app/backend" -ForegroundColor Gray
    Write-Host "   php artisan config:clear" -ForegroundColor Gray
    Write-Host "   php artisan config:cache" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Test via Laravel:" -ForegroundColor White
    Write-Host "   php artisan tinker" -ForegroundColor Gray
    Write-Host "   Cache::put('test', 'success', 60);" -ForegroundColor Gray
    Write-Host "   Cache::get('test');" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Cyan
    Write-Host "  Stop Redis:    docker stop redis" -ForegroundColor Gray
    Write-Host "  Start Redis:   docker start redis" -ForegroundColor Gray
    Write-Host "  Remove Redis:  docker rm -f redis" -ForegroundColor Gray
    Write-Host "  Monitor Redis: docker exec redis redis-cli monitor" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "⚠️  Redis container started but not responding yet" -ForegroundColor Yellow
    Write-Host "   Wait a few seconds and test manually:" -ForegroundColor Yellow
    Write-Host "   docker exec redis redis-cli ping" -ForegroundColor Gray
    Write-Host ""
}
