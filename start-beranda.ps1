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

