# Fix ChunkLoadError - Clear cache and restart dev server
# QuickKasir Frontend

Write-Host "🔧 Fixing ChunkLoadError..." -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any running dev server
Write-Host "Step 1: Stopping dev server..." -ForegroundColor Yellow
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe*" }
if ($processes) {
    Write-Host "⚠️  Found running Node processes. Please stop them manually (Ctrl+C in terminal)" -ForegroundColor Yellow
    Write-Host "   Or kill them: Get-Process node | Stop-Process -Force" -ForegroundColor Gray
}

Write-Host ""

# Step 2: Clear webpack cache
Write-Host "Step 2: Clearing webpack cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "✅ Webpack cache cleared" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No webpack cache found" -ForegroundColor Gray
}

# Step 3: Clear build folder
Write-Host "Step 3: Clearing build folder..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
    Write-Host "✅ Build folder cleared" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No build folder found" -ForegroundColor Gray
}

# Step 4: Clear .cache folder (if exists)
Write-Host "Step 4: Clearing .cache folder..." -ForegroundColor Yellow
if (Test-Path ".cache") {
    Remove-Item -Recurse -Force ".cache" -ErrorAction SilentlyContinue
    Write-Host "✅ .cache folder cleared" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No .cache folder found" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Instructions
Write-Host "============================" -ForegroundColor Cyan
Write-Host "✅ Cache cleared!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Clear browser cache:" -ForegroundColor White
Write-Host "   - Chrome/Edge: Ctrl+Shift+Delete" -ForegroundColor Gray
Write-Host "   - Or: Hard refresh (Ctrl+Shift+R)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart dev server:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "3. If still error, try:" -ForegroundColor White
Write-Host "   npm run clean" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
