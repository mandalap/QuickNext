# Script untuk start frontend dengan ngrok untuk PWA install
# Usage: .\start-with-ngrok.ps1

Write-Host "📱 Starting Frontend with ngrok for PWA Install" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "❌ ngrok is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Install ngrok:" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://ngrok.com/download" -ForegroundColor White
    Write-Host "   2. Or install via Chocolatey: choco install ngrok" -ForegroundColor White
    Write-Host "   3. Setup authtoken: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ ngrok is installed" -ForegroundColor Green
Write-Host ""

# Check if authtoken is configured
$ngrokConfig = "$env:USERPROFILE\.ngrok2\ngrok.yml"
if (-not (Test-Path $ngrokConfig)) {
    Write-Host "⚠️  ngrok authtoken not configured!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 Setup authtoken:" -ForegroundColor Yellow
    Write-Host "   ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ ngrok authtoken configured" -ForegroundColor Green
Write-Host ""

# Start React dev server in background
Write-Host "🚀 Starting React development server..." -ForegroundColor Yellow
$reactProcess = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -NoNewWindow

# Wait for React to start
Write-Host "⏳ Waiting for React server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start ngrok
Write-Host "🌐 Starting ngrok tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📱 Your ngrok URL will appear below:" -ForegroundColor Cyan
Write-Host ""

# Start ngrok and capture output
$ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http", "3000" -PassThru -NoNewWindow

# Wait a bit for ngrok to start
Start-Sleep -Seconds 5

# Try to get ngrok URL from API
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction SilentlyContinue
    if ($ngrokApi.tunnels) {
        $ngrokUrl = $ngrokApi.tunnels[0].public_url
        Write-Host "✅ ngrok tunnel active!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Access from mobile:" -ForegroundColor Cyan
        Write-Host "   $ngrokUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Update .env.local with:" -ForegroundColor Yellow
        Write-Host "   REACT_APP_API_BASE_URL=$ngrokUrl" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "⚠️  Could not get ngrok URL automatically" -ForegroundColor Yellow
    Write-Host "   Check ngrok dashboard: http://localhost:4040" -ForegroundColor White
    Write-Host ""
}

Write-Host "🛑 Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Wait for user to stop
try {
    Wait-Process -Id $reactProcess.Id, $ngrokProcess.Id
} catch {
    Write-Host ""
    Write-Host "🛑 Stopping servers..." -ForegroundColor Yellow
    Stop-Process -Id $reactProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Servers stopped" -ForegroundColor Green
}




