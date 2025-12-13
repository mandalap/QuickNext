# PowerShell Script untuk Menjalankan Frontend dan Beranda Bersamaan
# Kasir POS System

Write-Host "🚀 Memulai Frontend & Beranda..." -ForegroundColor Green
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
$frontendPath = "$projectRoot\app\frontend"
$berandaPath = "$projectRoot\app\beranda"

# Cek apakah direktori ada
if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Direktori frontend tidak ditemukan: $frontendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $berandaPath)) {
    Write-Host "❌ Direktori beranda tidak ditemukan: $berandaPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Frontend Path: $frontendPath" -ForegroundColor Cyan
Write-Host "📁 Beranda Path: $berandaPath" -ForegroundColor Cyan
Write-Host ""

# Jalankan Frontend React
Write-Host "⚛️ Memulai Frontend React..." -ForegroundColor Yellow
$frontendProcess = Start-BackgroundProcess -Command "npm start" -WorkingDirectory $frontendPath -ProcessName "Frontend React"

# Tunggu sebentar agar frontend bisa start
Start-Sleep -Seconds 3

# Jalankan Beranda Next.js
Write-Host "🌐 Memulai Beranda Landing Page (Next.js)..." -ForegroundColor Yellow
$berandaProcess = Start-BackgroundProcess -Command "npm run dev" -WorkingDirectory $berandaPath -ProcessName "Beranda Landing Page"

Write-Host ""
Write-Host "🎉 Frontend & Beranda berhasil dimulai!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "⚛️ Frontend React: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🌐 Beranda Landing: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Informasi Proses:" -ForegroundColor Yellow
Write-Host "   Frontend PID: $($frontendProcess.Id)" -ForegroundColor White
Write-Host "   Beranda PID: $($berandaProcess.Id)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Buka browser ke http://localhost:3000 untuk mengakses aplikasi" -ForegroundColor White
Write-Host "   - Buka http://localhost:3001 untuk mengakses landing page" -ForegroundColor White
Write-Host "   - Gunakan Ctrl+C di terminal masing-masing untuk menghentikan server" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Menunggu server startup..." -ForegroundColor Yellow

# Tunggu sebentar untuk memastikan server sudah running
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🎯 Sistem siap digunakan!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Beranda: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tekan Enter untuk keluar..." -ForegroundColor Gray
Read-Host

