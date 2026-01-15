# PowerShell Script untuk Menjalankan Beranda Landing Page
# Next.js Landing Page

Write-Host "🚀 Memulai Beranda Landing Page..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Path ke direktori beranda
$berandaPath = "E:\development\kasir-pos-system\app\beranda"

# Cek apakah direktori ada
if (-not (Test-Path $berandaPath)) {
    Write-Host "❌ Direktori beranda tidak ditemukan: $berandaPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Beranda Path: $berandaPath" -ForegroundColor Cyan
Write-Host ""

# Cek apakah port 3001 sudah digunakan
Write-Host "🔍 Mengecek port 3001..." -ForegroundColor Yellow
$portInUse = netstat -ano | findstr :3001 | findstr LISTENING
if ($portInUse) {
    Write-Host "⚠️  Port 3001 sudah digunakan!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solusi:" -ForegroundColor Yellow
    Write-Host "   1. Jalankan .\kill-port-3001.ps1 untuk menghentikan proses" -ForegroundColor White
    Write-Host "   2. Atau tutup aplikasi yang menggunakan port 3001" -ForegroundColor White
    Write-Host ""
    Write-Host "Proses yang menggunakan port 3001:" -ForegroundColor Cyan
    $portInUse | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    Write-Host ""
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host "✅ Port 3001 tersedia" -ForegroundColor Green
Write-Host ""

# Jalankan Next.js Development Server
Write-Host "⚛️ Memulai Next.js Development Server..." -ForegroundColor Yellow
Write-Host "   Command: npm run dev" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "powershell.exe"
$processInfo.Arguments = "-NoExit -Command `"cd '$berandaPath'; npm run dev`""
$processInfo.WorkingDirectory = $berandaPath
$processInfo.UseShellExecute = $true
$processInfo.WindowStyle = "Normal"

$process = [System.Diagnostics.Process]::Start($processInfo)

if ($process) {
    Write-Host "✅ Beranda Landing Page berhasil dimulai (PID: $($process.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Beranda: http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Yellow
    Write-Host "   - Buka browser ke http://localhost:3001 untuk mengakses landing page"
    Write-Host "   - Tutup window terminal untuk menghentikan server"
} else {
    Write-Host "❌ Gagal memulai Beranda Landing Page" -ForegroundColor Red
}

Write-Host ""
Write-Host "⏳ Menunggu server startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""

