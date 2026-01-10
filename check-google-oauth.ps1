# PowerShell script untuk check Google OAuth configuration
# Run: .\check-google-oauth.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🔍 Google OAuth Configuration Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Check .env file
Write-Host ""
Write-Host "1️⃣  Checking .env file..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$envFile = "app/backend/.env"
if (Test-Path $envFile) {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content $envFile
    
    # Check GOOGLE_CLIENT_ID
    $clientId = $envContent | Select-String "GOOGLE_CLIENT_ID=" | ForEach-Object { $_.Line.Split('=')[1] }
    if ([string]::IsNullOrEmpty($clientId)) {
        Write-Host "❌ GOOGLE_CLIENT_ID is empty!" -ForegroundColor Red
    } else {
        $displayId = $clientId.Substring(0, [Math]::Min(20, $clientId.Length)) + "..."
        Write-Host "✅ GOOGLE_CLIENT_ID: $displayId" -ForegroundColor Green
    }
    
    # Check GOOGLE_CLIENT_SECRET
    $clientSecret = $envContent | Select-String "GOOGLE_CLIENT_SECRET=" | ForEach-Object { $_.Line.Split('=')[1] }
    if ([string]::IsNullOrEmpty($clientSecret)) {
        Write-Host "❌ GOOGLE_CLIENT_SECRET is empty!" -ForegroundColor Red
    } else {
        $displaySecret = $clientSecret.Substring(0, [Math]::Min(20, $clientSecret.Length)) + "..."
        Write-Host "✅ GOOGLE_CLIENT_SECRET: $displaySecret" -ForegroundColor Green
    }
    
    # Check GOOGLE_REDIRECT_URI
    $redirectUri = $envContent | Select-String "GOOGLE_REDIRECT_URI=" | ForEach-Object { $_.Line.Split('=')[1] }
    if ([string]::IsNullOrEmpty($redirectUri)) {
        Write-Host "❌ GOOGLE_REDIRECT_URI is empty!" -ForegroundColor Red
    } else {
        Write-Host "✅ GOOGLE_REDIRECT_URI: $redirectUri" -ForegroundColor Green
    }
    
    # Check FRONTEND_URL
    $frontendUrl = $envContent | Select-String "FRONTEND_URL=" | ForEach-Object { $_.Line.Split('=')[1] }
    if ([string]::IsNullOrEmpty($frontendUrl)) {
        Write-Host "❌ FRONTEND_URL is empty!" -ForegroundColor Red
    } else {
        Write-Host "✅ FRONTEND_URL: $frontendUrl" -ForegroundColor Green
    }
    
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
}

# 2. Check config/services.php
Write-Host ""
Write-Host "2️⃣  Checking config/services.php..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$servicesFile = "app/backend/config/services.php"
if (Test-Path $servicesFile) {
    $content = Get-Content $servicesFile -Raw
    if ($content -match "'google'") {
        Write-Host "✅ Google config exists in services.php" -ForegroundColor Green
    } else {
        Write-Host "❌ Google config not found in services.php!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ config/services.php not found!" -ForegroundColor Red
}

# 3. Check SocialAuthController
Write-Host ""
Write-Host "3️⃣  Checking SocialAuthController..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$controllerFile = "app/backend/app/Http/Controllers/Api/SocialAuthController.php"
if (Test-Path $controllerFile) {
    Write-Host "✅ SocialAuthController exists" -ForegroundColor Green
    
    $controllerContent = Get-Content $controllerFile -Raw
    if ($controllerContent -match "redirectToGoogle") {
        Write-Host "✅ redirectToGoogle method exists" -ForegroundColor Green
    } else {
        Write-Host "❌ redirectToGoogle method not found!" -ForegroundColor Red
    }
    
    if ($controllerContent -match "handleGoogleCallback") {
        Write-Host "✅ handleGoogleCallback method exists" -ForegroundColor Green
    } else {
        Write-Host "❌ handleGoogleCallback method not found!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ SocialAuthController not found!" -ForegroundColor Red
}

# 4. Check routes
Write-Host ""
Write-Host "4️⃣  Checking web routes..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$routesFile = "app/backend/routes/web.php"
if (Test-Path $routesFile) {
    $routesContent = Get-Content $routesFile -Raw
    
    if ($routesContent -match "auth/google/redirect") {
        Write-Host "✅ /auth/google/redirect route exists" -ForegroundColor Green
    } else {
        Write-Host "❌ /auth/google/redirect route not found!" -ForegroundColor Red
    }
    
    if ($routesContent -match "auth/google/callback") {
        Write-Host "✅ /auth/google/callback route exists" -ForegroundColor Green
    } else {
        Write-Host "❌ /auth/google/callback route not found!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ routes/web.php not found!" -ForegroundColor Red
}

# 5. Check frontend Login component
Write-Host ""
Write-Host "5️⃣  Checking frontend Login component..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$loginFile = "app/frontend/src/components/Auth/Login.jsx"
if (Test-Path $loginFile) {
    $loginContent = Get-Content $loginFile -Raw
    
    if ($loginContent -match "Lanjutkan dengan Google") {
        Write-Host "✅ Google login button exists" -ForegroundColor Green
        
        if ($loginContent -match "auth/google/redirect") {
            Write-Host "✅ Google redirect URL is set" -ForegroundColor Green
        } else {
            Write-Host "❌ Google redirect URL not found!" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Google login button not found!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Login.jsx not found!" -ForegroundColor Red
}

# 6. Check Laravel Socialite
Write-Host ""
Write-Host "6️⃣  Checking Laravel Socialite..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$composerFile = "app/backend/composer.json"
if (Test-Path $composerFile) {
    $composerContent = Get-Content $composerFile -Raw
    
    if ($composerContent -match "laravel/socialite") {
        Write-Host "✅ Laravel Socialite is in composer.json" -ForegroundColor Green
    } else {
        Write-Host "❌ Laravel Socialite not found in composer.json!" -ForegroundColor Red
        Write-Host "   Install with: composer require laravel/socialite" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ composer.json not found!" -ForegroundColor Red
}

# 7. Check if servers are running
Write-Host ""
Write-Host "7️⃣  Checking if servers are running..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

# Check Laravel server (port 8000)
$laravelCheck = Test-NetConnection -ComputerName localhost -Port 8000 -WarningAction SilentlyContinue
if ($laravelCheck.TcpTestSucceeded) {
    Write-Host "✅ Laravel server is running on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "❌ Laravel server is NOT running on http://localhost:8000" -ForegroundColor Red
    Write-Host "   Start with: php artisan serve" -ForegroundColor Yellow
}

# Check React server (port 3000)
$reactCheck = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if ($reactCheck.TcpTestSucceeded) {
    Write-Host "✅ React server is running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ React server is NOT running on http://localhost:3000" -ForegroundColor Red
    Write-Host "   Start with: npm start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Check Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Summary of next steps
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Magenta
Write-Host "1. If any checks failed, fix the configuration" -ForegroundColor Gray
Write-Host "2. Ensure both Laravel and React servers are running" -ForegroundColor Gray
Write-Host "3. Clear Laravel cache: php artisan optimize:clear" -ForegroundColor Gray
Write-Host "4. Test Google login: http://localhost:3000/login" -ForegroundColor Gray
Write-Host "5. Check browser console (F12) for errors" -ForegroundColor Gray
Write-Host "6. Check Laravel logs: storage/logs/laravel.log" -ForegroundColor Gray

