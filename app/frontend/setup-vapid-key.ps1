# PowerShell script to setup VAPID key in .env.local
# Usage: .\setup-vapid-key.ps1

$vapidKey = "BKCUpjqgx0AuclTfYlmTwgliKekCHL4KgH24yddKUEjJvcv_WX7d7uM0ZKE-rqZq4uPNAwKRPFEMDdrit3hOEO8"
$envFile = ".env.local"
$content = "REACT_APP_VAPID_PUBLIC_KEY=$vapidKey"

Write-Host "🔑 Setting up VAPID key in .env.local..." -ForegroundColor Cyan

# Check if file exists
if (Test-Path $envFile) {
    Write-Host "⚠️  File .env.local already exists" -ForegroundColor Yellow
    
    # Check if key already exists
    $existingContent = Get-Content $envFile -Raw
    if ($existingContent -match "REACT_APP_VAPID_PUBLIC_KEY") {
        Write-Host "✅ VAPID key already exists in file" -ForegroundColor Green
        Write-Host "📝 Current content:" -ForegroundColor Cyan
        Get-Content $envFile
    } else {
        Write-Host "➕ Adding VAPID key to existing file..." -ForegroundColor Yellow
        Add-Content -Path $envFile -Value "`n$content"
        Write-Host "✅ VAPID key added successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "📝 Creating new .env.local file..." -ForegroundColor Cyan
    Set-Content -Path $envFile -Value $content
    Write-Host "✅ File created successfully!" -ForegroundColor Green
}

Write-Host "`n📋 File content:" -ForegroundColor Cyan
Get-Content $envFile

Write-Host "`n⚠️  IMPORTANT: Restart your development server!" -ForegroundColor Yellow
Write-Host "   1. Stop server (Ctrl+C)" -ForegroundColor White
Write-Host "   2. Run: npm start" -ForegroundColor White
Write-Host "   3. Refresh browser (Ctrl+Shift+R)" -ForegroundColor White

