Write-Host "Clearing Rate Limit Cache..." -ForegroundColor Cyan
php clear_rate_limit.php
Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

