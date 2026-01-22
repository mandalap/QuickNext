# Install Redis untuk Windows (QuickKasir POS System)
# Script ini akan membantu install Redis di Windows menggunakan WSL atau Docker

Write-Host "🚀 QuickKasir - Redis Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if WSL is installed
$wslInstalled = Get-Command wsl -ErrorAction SilentlyContinue

if ($wslInstalled) {
    Write-Host "✅ WSL detected!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installing Redis via WSL..." -ForegroundColor Yellow
    
    # Install Redis di WSL
    wsl sudo apt update
    wsl sudo apt install -y redis-server
    wsl sudo service redis-server start
    
    Write-Host ""
    Write-Host "Testing Redis connection..." -ForegroundColor Yellow
    $testResult = wsl redis-cli ping
    
    if ($testResult -eq "PONG") {
        Write-Host "✅ Redis installed and running successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Redis is now running on: 127.0.0.1:6379" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Redis installation failed. Please check manually." -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  WSL not detected!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "1. Install WSL (Recommended):" -ForegroundColor White
    Write-Host "   wsl --install" -ForegroundColor Gray
    Write-Host "   Then restart your computer and run this script again." -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Use Docker (if Docker is installed):" -ForegroundColor White
    Write-Host "   docker run -d --name redis -p 6379:6379 redis:alpine" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Use Memurai (Windows Native):" -ForegroundColor White
    Write-Host "   Download from: https://www.memurai.com/" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "Do you want to install WSL now? (y/n)"
    
    if ($choice -eq "y" -or $choice -eq "Y") {
        Write-Host ""
        Write-Host "Installing WSL..." -ForegroundColor Yellow
        wsl --install
        
        Write-Host ""
        Write-Host "⚠️  Please restart your computer and run this script again!" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env file with Redis configuration" -ForegroundColor White
Write-Host "2. Run: composer require predis/predis" -ForegroundColor White
Write-Host "3. Run: php artisan config:clear" -ForegroundColor White
Write-Host "4. Run: php artisan config:cache" -ForegroundColor White
Write-Host "5. Test with: .\scripts\test-redis.ps1" -ForegroundColor White
Write-Host ""
