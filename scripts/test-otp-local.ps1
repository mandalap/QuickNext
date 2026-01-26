# Script untuk Test WhatsApp OTP di Local (Windows PowerShell)
# Usage: .\scripts\test-otp-local.ps1

Write-Host "🧪 Testing WhatsApp OTP Endpoint..." -ForegroundColor Yellow
Write-Host ""

# Check if backend is running
Write-Host "Step 1: Checking if backend is running..." -ForegroundColor Yellow
$backendUrl = "http://localhost:8000"
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/api/business-types" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Backend is running at $backendUrl" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not running at $backendUrl" -ForegroundColor Red
    Write-Host "   Please start backend with: cd app/backend && php artisan serve" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test endpoint
Write-Host "Step 2: Testing /api/whatsapp/send-otp endpoint..." -ForegroundColor Yellow
Write-Host ""

$testPhone = if ($args[0]) { $args[0] } else { "081234567890" }
Write-Host "Sending OTP request to: $backendUrl/api/whatsapp/send-otp"
Write-Host "Phone: $testPhone"
Write-Host ""

$body = @{
    phone = $testPhone
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$backendUrl/api/whatsapp/send-otp" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ Response:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ OTP sent successfully!" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorStream)
    $errorBody = $reader.ReadToEnd()
    
    Write-Host "❌ Error Response:" -ForegroundColor Red
    try {
        $errorJson = $errorBody | ConvertFrom-Json
        $errorJson | ConvertTo-Json -Depth 10
    } catch {
        Write-Host $errorBody
    }
    Write-Host ""
    Write-Host "HTTP Status: $statusCode" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 422) {
        Write-Host "⚠️  Validation error (422)" -ForegroundColor Yellow
        Write-Host "   This might mean:" -ForegroundColor Yellow
        Write-Host "   - Phone number format is invalid" -ForegroundColor Yellow
        Write-Host "   - Phone number is already registered" -ForegroundColor Yellow
        Write-Host "   - Rate limit exceeded (max 5 requests per minute)" -ForegroundColor Yellow
    } elseif ($statusCode -eq 500) {
        Write-Host "❌ Server error (500)" -ForegroundColor Red
        Write-Host "   This might mean:" -ForegroundColor Yellow
        Write-Host "   - No active WhatsApp token configured" -ForegroundColor Yellow
        Write-Host "   - WhatsApp API service is down" -ForegroundColor Yellow
        Write-Host "   - Check backend logs: Get-Content app/backend/storage/logs/laravel.log -Tail 50" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Unexpected status code: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Check backend logs
Write-Host "Step 3: Checking recent backend logs..." -ForegroundColor Yellow
$logFile = "app/backend/storage/logs/laravel.log"
if (Test-Path $logFile) {
    Write-Host "Recent WhatsApp OTP related logs:"
    Get-Content $logFile -Tail 50 | Select-String -Pattern "whatsapp|otp|WhatsApp" -CaseSensitive:$false | Select-Object -Last 10
} else {
    Write-Host "Log file not found: $logFile" -ForegroundColor Yellow
}
Write-Host ""

# Instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "💡 Troubleshooting Tips:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Check browser console (F12) for errors"
Write-Host "2. Verify API_CONFIG.BASE_URL in frontend matches backend URL"
Write-Host "3. Check if WhatsApp token is configured in Filament admin"
Write-Host "   - Open: http://localhost:8000/admin"
Write-Host "   - Login as admin"
Write-Host "   - Go to: WhatsApp API Tokens"
Write-Host "   - Add token with status: active"
Write-Host "4. Verify phone number format: 081234567890 (Indonesia)"
Write-Host "5. Check rate limiting (max 5 requests per minute)"
Write-Host ""
Write-Host "To test from frontend:"
Write-Host "  - Open http://localhost:3000/register"
Write-Host "  - Enter phone number"
Write-Host "  - Click 'Kirim OTP'"
Write-Host "  - Check browser console (F12) for errors"
Write-Host ""
