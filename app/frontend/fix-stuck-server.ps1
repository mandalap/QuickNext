# Script untuk fix server yang stuck di "Starting the development server..."

Write-Host "🔧 Fixing Stuck Development Server" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kill all node processes
Write-Host "1️⃣ Killing all node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            Write-Host "   ✅ Killed node process $($_.Id)" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Could not kill process $($_.Id)" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 3
} else {
    Write-Host "   ✅ No node processes running" -ForegroundColor Green
}
Write-Host ""

# 2. Clear webpack cache
Write-Host "2️⃣ Clearing webpack cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cache cleared" -ForegroundColor Green
} else {
    Write-Host "   ✅ No cache to clear" -ForegroundColor Green
}
Write-Host ""

# 3. Clear build directory
Write-Host "3️⃣ Clearing build directory..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Build directory cleared" -ForegroundColor Green
} else {
    Write-Host "   ✅ No build directory" -ForegroundColor Green
}
Write-Host ""

# 4. Check port 3000
Write-Host "4️⃣ Checking port 3000..." -ForegroundColor Yellow
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "   ⚠️  Port 3000 still in use, waiting..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $port3000 = netstat -ano | findstr :3000
    if ($port3000) {
        Write-Host "   ⚠️  Port still in use, trying to kill..." -ForegroundColor Yellow
        $port3000 | ForEach-Object {
            if ($_ -match 'LISTENING\s+(\d+)') {
                $pid = $matches[1]
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "   ✅ Port 3000 is available" -ForegroundColor Green
}
Write-Host ""

# 5. Set environment variables for faster startup
Write-Host "5️⃣ Setting environment variables..." -ForegroundColor Yellow
$env:SKIP_PREFLIGHT_CHECK = "true"
$env:FAST_REFRESH = "true"
$env:WDS_SOCKET_HOST = "localhost"
$env:WDS_SOCKET_PORT = "3000"
Write-Host "   ✅ Environment variables set" -ForegroundColor Green
Write-Host ""

# 6. Summary
Write-Host "📋 SUMMARY" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan
Write-Host "✅ Ready to start!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   Run: npm start" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: First startup may take 30-60 seconds" -ForegroundColor Yellow
Write-Host "   This is normal for initial webpack compilation" -ForegroundColor Gray
Write-Host ""

