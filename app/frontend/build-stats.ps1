# Quick build statistics from gzipped output
# Parses the build output to show key metrics

Write-Host "📊 BUILD STATISTICS (Gzipped)" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Sample data from your build output
$buildData = @"
205.93 kB  build\static\js\vendors.7f2c8659.js
199.58 kB  build\static\js\common.02856be6.chunk.js
150.81 kB  build\static\js\pdf-export.17b6255f.chunk.js
98.49 kB   build\static\js\icons.ea4596f4.js
71.44 kB   build\static\js\react-vendor.8d2324a2.js
34.09 kB   build\static\js\661.cecb5a52.chunk.js
29.85 kB   build\static\js\utils-vendor.f497e00b.js
26.6 kB    build\static\js\ui-vendor.3dc6b2ec.js
22.81 kB   build\static\js\forms-vendor.cf876a86.chunk.js
19.79 kB   build\static\css\main.c2226114.css
"@

$lines = $buildData -split "`n"
$totalSize = 0
$jsFiles = 0
$cssFiles = 0

Write-Host "📦 File Analysis:" -ForegroundColor Green
Write-Host ""

foreach ($line in $lines) {
    if ($line -match '(\d+\.\d+)\s+kB\s+.*\.(js|css)') {
        $size = [double]$matches[1]
        $ext = $matches[2]
        $totalSize += $size
        
        if ($ext -eq 'js') {
            $jsFiles++
        } else {
            $cssFiles++
        }
    }
}

Write-Host "   Total Files: $($jsFiles + $cssFiles)" -ForegroundColor White
Write-Host "   JS Files: $jsFiles" -ForegroundColor White
Write-Host "   CSS Files: $cssFiles" -ForegroundColor White
Write-Host "   Total Size (gzipped): $([math]::Round($totalSize, 2)) kB" -ForegroundColor White
Write-Host "   Total Size (gzipped): $([math]::Round($totalSize / 1024, 2)) MB" -ForegroundColor White
Write-Host ""

# Estimate uncompressed size (typically 3-4x larger)
$estimatedUncompressed = $totalSize * 3.5
Write-Host "📈 Estimated Uncompressed Size:" -ForegroundColor Yellow
Write-Host "   ~$([math]::Round($estimatedUncompressed / 1024, 2)) MB" -ForegroundColor White
Write-Host ""

# Performance recommendations
Write-Host "💡 Performance Recommendations:" -ForegroundColor Cyan
if ($totalSize -gt 500) {
    Write-Host "   ⚠️  Bundle size is large" -ForegroundColor Yellow
    Write-Host "   💡 Consider:" -ForegroundColor Gray
    Write-Host "      - Code splitting" -ForegroundColor Gray
    Write-Host "      - Lazy loading routes" -ForegroundColor Gray
    Write-Host "      - Tree shaking unused code" -ForegroundColor Gray
} else {
    Write-Host "   ✅ Bundle size is reasonable" -ForegroundColor Green
}

Write-Host ""

