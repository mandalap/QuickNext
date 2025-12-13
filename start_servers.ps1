# PowerShell Script untuk Menjalankan Backend dan Frontend
# Kasir POS System

Write-Host "🚀 Memulai Kasir POS System..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Fungsi untuk menjalankan command di background
function Start-BackgroundProcess {
    param(
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$ProcessName
    )
    
    Write-Host "🔄 Memulai $ProcessName..." -ForegroundColor Yellow
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "powershell.exe"
    $processInfo.Arguments = "-NoExit -Command `"cd '$WorkingDirectory'; $Command`""
    $processInfo.WorkingDirectory = $WorkingDirectory
    $processInfo.UseShellExecute = $true
    $processInfo.WindowStyle = "Normal"
    
    $process = [System.Diagnostics.Process]::Start($processInfo)
    
    if ($process) {
        Write-Host "✅ $ProcessName berhasil dimulai (PID: $($process.Id))" -ForegroundColor Green
        return $process
    } else {
        Write-Host "❌ Gagal memulai $ProcessName" -ForegroundColor Red
        return $null
    }
}

# Path ke direktori proyek
$projectRoot = "E:\development\kasir-pos-system"
$backendPath = "$projectRoot\app\backend"
$frontendPath = "$projectRoot\app\frontend"

# Cek apakah direktori ada
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Direktori backend tidak ditemukan: $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Direktori frontend tidak ditemukan: $frontendPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Backend Path: $backendPath" -ForegroundColor Cyan
Write-Host "📁 Frontend Path: $frontendPath" -ForegroundColor Cyan
Write-Host ""

# Jalankan Backend Laravel
Write-Host "🔧 Memulai Backend Laravel..." -ForegroundColor Yellow
$backendProcess = Start-BackgroundProcess -Command "php artisan serve --host=0.0.0.0 --port=8000" -WorkingDirectory $backendPath -ProcessName "Backend Laravel"

# Tunggu sebentar agar backend bisa start
Start-Sleep -Seconds 3

# Jalankan Frontend React
Write-Host "⚛️ Memulai Frontend React..." -ForegroundColor Yellow
$frontendProcess = Start-BackgroundProcess -Command "npm start" -WorkingDirectory $frontendPath -ProcessName "Frontend React"

Write-Host ""
Write-Host "🎉 Sistem Kasir POS berhasil dimulai!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "🌐 Backend Laravel: http://localhost:8000" -ForegroundColor Cyan
Write-Host "⚛️ Frontend React: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🧪 Test Connection: file:///$projectRoot/test_backend_connection.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Informasi Proses:" -ForegroundColor Yellow
Write-Host "   Backend PID: $($backendProcess.Id)" -ForegroundColor White
Write-Host "   Frontend PID: $($frontendProcess.Id)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Buka browser ke http://localhost:3000 untuk mengakses aplikasi" -ForegroundColor White
Write-Host "   - Buka http://localhost:8000 untuk mengakses API Laravel" -ForegroundColor White
Write-Host "   - Gunakan Ctrl+C di terminal masing-masing untuk menghentikan server" -ForegroundColor White
Write-Host "   - Buka test_backend_connection.html untuk test koneksi" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Menunggu server startup..." -ForegroundColor Yellow

# Tunggu sebentar untuk memastikan server sudah running
Start-Sleep -Seconds 5

# Test koneksi backend
Write-Host "🔍 Testing koneksi backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/dashboard/stats" -Headers @{"Accept"="application/json"} -TimeoutSec 5
    Write-Host "✅ Backend API merespons (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Backend API berjalan (Status: 401 - Auth Required)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Backend API belum siap: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 Sistem siap digunakan!" -ForegroundColor Green
Write-Host "   Buka http://localhost:3000 di browser untuk mulai menggunakan aplikasi" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tekan Enter untuk keluar..." -ForegroundColor Gray
Read-Host
