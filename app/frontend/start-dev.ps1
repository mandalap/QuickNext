# Script untuk start development server dengan auto-fix issues

Write-Host "🚀 Starting Development Server" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# 1. Kill process on port 3000
Write-Host "1️⃣ Checking port 3000..." -ForegroundColor Yellow
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "   ⚠️  Port 3000 is in use, killing process..." -ForegroundColor Yellow
    $port3000 | ForEach-Object {
        if ($_ -match 'LISTENING\s+(\d+)') {
            $pid = $matches[1]
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "   ✅ Killed process $pid" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  Could not kill process $pid" -ForegroundColor Yellow
            }
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ✅ Port 3000 is available" -ForegroundColor Green
}
Write-Host ""

# 2. Check node_modules
Write-Host "2️⃣ Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "   ❌ node_modules not found!" -ForegroundColor Red
    Write-Host "   💡 Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "   ✅ node_modules exists" -ForegroundColor Green
}
Write-Host ""

# 3. Start server
Write-Host "3️⃣ Starting development server..." -ForegroundColor Yellow
Write-Host ""
npm start

