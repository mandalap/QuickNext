# QuickKasir - Reset GitHub dengan Fresh Upload
# Script ini akan menghapus semua history di GitHub dan upload ulang dari awal

Write-Host "🔄 QuickKasir - Reset GitHub (Fresh Upload)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: Ini akan menghapus SEMUA history di GitHub!" -ForegroundColor Red
Write-Host "   Semua commit history akan hilang dan diganti dengan fresh start" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Apakah Anda yakin ingin melanjutkan? (ketik 'yes' untuk konfirmasi)"

if ($confirm -ne "yes") {
    Write-Host "❌ Dibatalkan oleh user" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Memulai fresh upload..." -ForegroundColor Green
Write-Host ""

# Step 1: Check current branch
Write-Host "Step 1: Checking current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "   Current branch: $currentBranch" -ForegroundColor Gray

# Step 2: Add all files
Write-Host ""
Write-Host "Step 2: Staging all files..." -ForegroundColor Yellow
git add -A
$status = git status --short
Write-Host "   Files staged: $($status.Count) files" -ForegroundColor Gray

# Step 3: Create orphan branch (fresh start, no history)
Write-Host ""
Write-Host "Step 3: Creating orphan branch (fresh start)..." -ForegroundColor Yellow
git checkout --orphan fresh-start

# Step 4: Remove all files from staging (but keep them in working directory)
Write-Host "Step 4: Preparing fresh commit..." -ForegroundColor Yellow
git reset

# Step 5: Add all files again
Write-Host "Step 5: Adding all files to fresh branch..." -ForegroundColor Yellow
git add -A

# Step 6: Create initial commit
Write-Host "Step 6: Creating initial commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit - QuickKasir POS System

Complete application with:
- Backend Laravel API
- Frontend React POS Application
- Landing Page Next.js
- Redis setup scripts
- Deployment guides
- Local setup guides"
git commit -m $commitMessage

Write-Host "✅ Fresh commit created!" -ForegroundColor Green
Write-Host ""

# Step 7: Force push to development branch
Write-Host "Step 7: Force pushing to development branch..." -ForegroundColor Yellow
git branch -D development 2>$null
git branch -m development
git push -f origin development

Write-Host "✅ Development branch updated!" -ForegroundColor Green
Write-Host ""

# Step 8: Force push to main branch
Write-Host "Step 8: Force pushing to main branch..." -ForegroundColor Yellow
git checkout -b main
git push -f origin main

Write-Host "✅ Main branch updated!" -ForegroundColor Green
Write-Host ""

# Step 9: Switch back to development
Write-Host "Step 9: Switching back to development..." -ForegroundColor Yellow
git checkout development

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "✅ Fresh Upload Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   - All history removed from GitHub" -ForegroundColor White
Write-Host "   - Fresh initial commit created" -ForegroundColor White
Write-Host "   - All files uploaded to development branch" -ForegroundColor White
Write-Host "   - All files uploaded to main branch" -ForegroundColor White
Write-Host ""
Write-Host "🔗 GitHub Repository:" -ForegroundColor Cyan
Write-Host "   https://github.com/mandalap/QuickNext" -ForegroundColor White
Write-Host ""
