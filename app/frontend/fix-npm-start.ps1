# Script untuk fix npm start issues
# Menangani masalah port sudah digunakan dan proses node yang stuck

Write-Host "🔧 Fixing npm start issues..." -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# 1. Check port 3000
Write-Host "1️⃣ Checking port 3000..." -ForegroundColor Yellow
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    Write-Host "   ⚠️  Port 3000 is already in use" -ForegroundColor Red
    $port3000 | ForEach-Object {
        if ($_ -match 'LISTENING\s+(\d+)') {
            $pid = $matches[1]
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "   Process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                Write-Host "   Started: $($process.StartTime)" -ForegroundColor Gray
            }
        }
    }
    Write-Host ""
    $kill = Read-Host "   Kill process using port 3000? (y/n)"
    if ($kill -eq 'y' -or $kill -eq 'Y') {
        $port3000 | ForEach-Object {
            if ($_ -match 'LISTENING\s+(\d+)') {
                $pid = $matches[1]
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "   ✅ Killed process $pid" -ForegroundColor Green
                } catch {
                    Write-Host "   ❌ Failed to kill process $pid" -ForegroundColor Red
                }
            }
        }
    }
} else {
    Write-Host "   ✅ Port 3000 is available" -ForegroundColor Green
}
Write-Host ""

# 2. Check for stuck node processes
Write-Host "2️⃣ Checking for stuck node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) node process(es)" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "   - PID: $($_.Id), Started: $($_.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    $killAll = Read-Host "   Kill all node processes? (y/n)"
    if ($killAll -eq 'y' -or $killAll -eq 'Y') {
        $nodeProcesses | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                Write-Host "   ✅ Killed node process $($_.Id)" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Failed to kill process $($_.Id)" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "   ✅ No stuck node processes" -ForegroundColor Green
}
Write-Host ""

# 3. Check node_modules
Write-Host "3️⃣ Checking node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ node_modules not found!" -ForegroundColor Red
    Write-Host "   💡 Run: npm install" -ForegroundColor Yellow
}
Write-Host ""

# 4. Clear cache
Write-Host "4️⃣ Clearing npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force 2>&1 | Out-Null
    Write-Host "   ✅ Cache cleared" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Cache clear failed (non-critical)" -ForegroundColor Yellow
}
Write-Host ""

# 5. Summary
Write-Host "📋 SUMMARY" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan
Write-Host "✅ Ready to start!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Run: npm start" -ForegroundColor White
Write-Host "   2. If still fails, check:" -ForegroundColor White
Write-Host "      - npm install (if node_modules missing)" -ForegroundColor Gray
Write-Host "      - Check npm-start.log for errors" -ForegroundColor Gray
Write-Host ""
Write-Host ""

