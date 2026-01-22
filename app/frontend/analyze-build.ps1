# PowerShell script untuk menganalisis build output
# Menampilkan statistik build files

Write-Host "📊 BUILD ANALYSIS" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

$buildPath = "build\static"
$totalSize = 0
$fileCount = 0
$jsFiles = @()
$cssFiles = @()

if (Test-Path $buildPath) {
    Write-Host "🔍 Analyzing build files..." -ForegroundColor Yellow
    Write-Host ""
    
    # Analyze JS files
    $jsFiles = Get-ChildItem -Path "$buildPath\js" -File -Recurse | Where-Object { $_.Extension -eq ".js" }
    $cssFiles = Get-ChildItem -Path "$buildPath\css" -File -Recurse | Where-Object { $_.Extension -eq ".css" }
    
    Write-Host "📦 JavaScript Files:" -ForegroundColor Green
    Write-Host "   Total JS files: $($jsFiles.Count)" -ForegroundColor White
    $jsTotalSize = ($jsFiles | Measure-Object -Property Length -Sum).Sum
    $jsTotalSizeMB = [math]::Round($jsTotalSize / 1MB, 2)
    Write-Host "   Total JS size: $jsTotalSizeMB MB" -ForegroundColor White
    Write-Host ""
    
    # Top 10 largest JS files
    Write-Host "   Top 10 Largest JS Files:" -ForegroundColor Yellow
    $jsFiles | Sort-Object Length -Descending | Select-Object -First 10 | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 2)
        Write-Host "   - $($_.Name): $sizeKB KB" -ForegroundColor Gray
    }
    Write-Host ""
    
    Write-Host "🎨 CSS Files:" -ForegroundColor Green
    Write-Host "   Total CSS files: $($cssFiles.Count)" -ForegroundColor White
    $cssTotalSize = ($cssFiles | Measure-Object -Property Length -Sum).Sum
    $cssTotalSizeKB = [math]::Round($cssTotalSize / 1KB, 2)
    Write-Host "   Total CSS size: $cssTotalSizeKB KB" -ForegroundColor White
    Write-Host ""
    
    # Total
    $totalSize = $jsTotalSize + $cssTotalSize
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host "📊 Total Build Size:" -ForegroundColor Cyan
    Write-Host "   Total: $totalSizeMB MB" -ForegroundColor White
    Write-Host ""
    
    # Recommendations
    Write-Host "💡 Recommendations:" -ForegroundColor Yellow
    if ($jsTotalSizeMB -gt 1) {
        Write-Host "   ⚠️  JS bundle is large ($jsTotalSizeMB MB)" -ForegroundColor Red
        Write-Host "   💡 Consider code splitting or lazy loading" -ForegroundColor Gray
    } else {
        Write-Host "   ✅ JS bundle size is reasonable" -ForegroundColor Green
    }
    
    if ($jsFiles.Count -gt 50) {
        Write-Host "   ⚠️  Many JS chunks ($($jsFiles.Count) files)" -ForegroundColor Yellow
        Write-Host "   💡 Consider reducing chunk count" -ForegroundColor Gray
    }
    
} else {
    Write-Host "❌ Build directory not found!" -ForegroundColor Red
    Write-Host "   Run 'npm run build' first" -ForegroundColor Yellow
}

Write-Host ""

