# Build Production Script untuk PWA
# Script ini akan melakukan build production untuk PWA

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Building PWA for Production..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Set environment variable untuk production
$env:NODE_ENV = "production"
$env:GENERATE_SOURCEMAP = "false"

# Clean build folder jika ada
if (Test-Path "build") {
    Write-Host "Cleaning previous build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "build"
}

# Clean cache
if (Test-Path "node_modules\.cache") {
    Write-Host "Cleaning cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.cache"
}

Write-Host "Starting production build..." -ForegroundColor Green
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

# Run build
npm run build

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    
    # Check build folder
    if (Test-Path "build") {
        $buildSize = (Get-ChildItem -Path "build" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan
        
        # Check for PWA files
        Write-Host "`nChecking PWA files..." -ForegroundColor Cyan
        if (Test-Path "build\manifest.json") {
            Write-Host "✓ manifest.json found" -ForegroundColor Green
        } else {
            Write-Host "✗ manifest.json not found" -ForegroundColor Red
        }
        
        if (Test-Path "build\service-worker.js") {
            Write-Host "✓ service-worker.js found" -ForegroundColor Green
        } else {
            Write-Host "✗ service-worker.js not found" -ForegroundColor Yellow
        }
        
        # List main files
        Write-Host "`nMain build files:" -ForegroundColor Cyan
        Get-ChildItem -Path "build" -File | Select-Object Name, @{Name="Size (KB)";Expression={[math]::Round($_.Length/1KB, 2)}} | Format-Table
        
        Write-Host "`nBuild output is ready in: build\" -ForegroundColor Green
        Write-Host "You can serve it with: npx serve -s build -l 3000" -ForegroundColor Yellow
    } else {
        Write-Host "Build folder not found. Build may have failed." -ForegroundColor Red
    }
} else {
    Write-Host "`n=========================================" -ForegroundColor Red
    Write-Host "Build failed!" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    exit 1
}
