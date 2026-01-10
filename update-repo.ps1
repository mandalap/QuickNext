# Script PowerShell untuk update repository
# Usage: .\update-repo.ps1 "Pesan commit"

param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "Update: Code changes"
)

Write-Host "🔄 Updating Git Repository" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# 1. Check status
Write-Host "📋 Checking status..." -ForegroundColor Yellow
git status --short

$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host "✅ No changes to commit" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "📝 Files to commit:" -ForegroundColor Yellow
git status --short | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

Write-Host ""
$confirm = Read-Host "Continue? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 1
}

# 2. Add all changes
Write-Host ""
Write-Host "➕ Adding changes..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to add files" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Changes added" -ForegroundColor Green

# 3. Commit
Write-Host ""
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
Write-Host "   Message: $Message" -ForegroundColor Gray
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to commit" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Changes committed" -ForegroundColor Green

# 4. Push
Write-Host ""
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to push" -ForegroundColor Red
    Write-Host "💡 Tip: Try 'git push -u origin main' if this is first push" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Successfully pushed to GitHub" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Repository updated successfully!" -ForegroundColor Green
