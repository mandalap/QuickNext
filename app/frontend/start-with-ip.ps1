# Script untuk start frontend dengan IP address untuk akses dari HP
# Usage: .\start-with-ip.ps1

Write-Host "📱 Starting Frontend with IP Address for Mobile Access" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
Write-Host "🔍 Detecting local IP address..." -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "❌ Could not detect IP address. Please enter manually:" -ForegroundColor Red
    $ipAddress = Read-Host "Enter your IP address"
}

Write-Host "✅ Detected IP: $ipAddress" -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "📝 Creating .env.local file..." -ForegroundColor Yellow
    @"
HOST=0.0.0.0
REACT_APP_API_BASE_URL=http://$ipAddress:8000
"@ | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "✅ Created .env.local" -ForegroundColor Green
} else {
    Write-Host "📝 Updating .env.local file..." -ForegroundColor Yellow
    $content = Get-Content $envFile -Raw
    
    # Update HOST
    if ($content -match "HOST=") {
        $content = $content -replace "HOST=.*", "HOST=0.0.0.0"
    } else {
        $content += "`nHOST=0.0.0.0"
    }
    
    # Update API URL
    if ($content -match "REACT_APP_API_BASE_URL=") {
        $content = $content -replace "REACT_APP_API_BASE_URL=.*", "REACT_APP_API_BASE_URL=http://$ipAddress:8000"
    } else {
        $content += "`nREACT_APP_API_BASE_URL=http://$ipAddress:8000"
    }
    
    $content | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "✅ Updated .env.local" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting React development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📱 Access from mobile:" -ForegroundColor Cyan
Write-Host "   http://$ipAddress:3000" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: PWA install requires HTTPS!" -ForegroundColor Yellow
Write-Host "   For PWA install, use ngrok or setup HTTPS" -ForegroundColor Yellow
Write-Host "   See PWA_INSTALL_LOCAL_IP_GUIDE.md for details" -ForegroundColor Yellow
Write-Host ""

# Start React dev server
npm start




