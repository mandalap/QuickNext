# PowerShell Script untuk Kill Process di Port 3001
# Digunakan jika port 3001 masih digunakan

Write-Host "🔍 Mencari proses yang menggunakan port 3001..." -ForegroundColor Yellow

$ports = netstat -ano | findstr :3001
if ($ports) {
    Write-Host "✅ Ditemukan proses yang menggunakan port 3001:" -ForegroundColor Cyan
    $ports | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    
    # Extract PIDs
    $pids = $ports | ForEach-Object { 
        $parts = $_ -split '\s+'
        $parts[-1]
    } | Where-Object { $_ -ne '0' } | Sort-Object -Unique
    
    foreach ($processId in $pids) {
        if ($processId -match '^\d+$') {
            try {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "🛑 Menghentikan proses PID $processId ($($process.ProcessName))..." -ForegroundColor Yellow
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Write-Host "✅ Proses PID $processId berhasil dihentikan" -ForegroundColor Green
                }
            } catch {
                Write-Host "⚠️  Gagal menghentikan PID $processId : $_" -ForegroundColor Red
            }
        }
    }
    
    Start-Sleep -Seconds 2
    
    # Verify
    $remaining = netstat -ano | findstr :3001 | findstr LISTENING
    if ($remaining) {
        Write-Host "⚠️  Masih ada proses yang menggunakan port 3001" -ForegroundColor Red
        Write-Host "   Jalankan script ini lagi atau restart komputer" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Port 3001 sekarang tersedia!" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Port 3001 tidak digunakan" -ForegroundColor Green
}

Write-Host ""
Write-Host "Tekan Enter untuk keluar..." -ForegroundColor Gray
Read-Host
