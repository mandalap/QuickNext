#!/bin/bash
# Script untuk check Google OAuth configuration

echo "======================================"
echo "🔍 Google OAuth Configuration Check"
echo "======================================"

# Check .env file
echo ""
echo "1️⃣  Checking .env file..."
echo "=================================="

if [ -f "app/backend/.env" ]; then
    echo "✅ .env file exists"
    
    if grep -q "GOOGLE_CLIENT_ID=" app/backend/.env; then
        CLIENT_ID=$(grep "GOOGLE_CLIENT_ID=" app/backend/.env | cut -d'=' -f2)
        if [ -z "$CLIENT_ID" ]; then
            echo "❌ GOOGLE_CLIENT_ID is empty!"
        else
            echo "✅ GOOGLE_CLIENT_ID: ${CLIENT_ID:0:20}..."
        fi
    else
        echo "❌ GOOGLE_CLIENT_ID not found in .env!"
    fi
    
    if grep -q "GOOGLE_CLIENT_SECRET=" app/backend/.env; then
        SECRET=$(grep "GOOGLE_CLIENT_SECRET=" app/backend/.env | cut -d'=' -f2)
        if [ -z "$SECRET" ]; then
            echo "❌ GOOGLE_CLIENT_SECRET is empty!"
        else
            echo "✅ GOOGLE_CLIENT_SECRET: ${SECRET:0:20}..."
        fi
    else
        echo "❌ GOOGLE_CLIENT_SECRET not found in .env!"
    fi
    
    if grep -q "GOOGLE_REDIRECT_URI=" app/backend/.env; then
        REDIRECT=$(grep "GOOGLE_REDIRECT_URI=" app/backend/.env | cut -d'=' -f2)
        if [ -z "$REDIRECT" ]; then
            echo "❌ GOOGLE_REDIRECT_URI is empty!"
        else
            echo "✅ GOOGLE_REDIRECT_URI: $REDIRECT"
        fi
    else
        echo "❌ GOOGLE_REDIRECT_URI not found in .env!"
    fi
    
else
    echo "❌ .env file not found!"
fi

# Check config file
echo ""
echo "2️⃣  Checking config/services.php..."
echo "=================================="

if [ -f "app/backend/config/services.php" ]; then
    if grep -q "'google'" app/backend/config/services.php; then
        echo "✅ Google config exists in services.php"
    else
        echo "❌ Google config not found in services.php!"
    fi
else
    echo "❌ config/services.php not found!"
fi

# Check SocialAuthController
echo ""
echo "3️⃣  Checking SocialAuthController..."
echo "=================================="

if [ -f "app/backend/app/Http/Controllers/Api/SocialAuthController.php" ]; then
    echo "✅ SocialAuthController exists"
    
    if grep -q "redirectToGoogle" app/backend/app/Http/Controllers/Api/SocialAuthController.php; then
        echo "✅ redirectToGoogle method exists"
    else
        echo "❌ redirectToGoogle method not found!"
    fi
    
    if grep -q "handleGoogleCallback" app/backend/app/Http/Controllers/Api/SocialAuthController.php; then
        echo "✅ handleGoogleCallback method exists"
    else
        echo "❌ handleGoogleCallback method not found!"
    fi
else
    echo "❌ SocialAuthController not found!"
fi

# Check routes
echo ""
echo "4️⃣  Checking web routes..."
echo "=================================="

if [ -f "app/backend/routes/web.php" ]; then
    if grep -q "auth/google/redirect" app/backend/routes/web.php; then
        echo "✅ /auth/google/redirect route exists"
    else
        echo "❌ /auth/google/redirect route not found!"
    fi
    
    if grep -q "auth/google/callback" app/backend/routes/web.php; then
        echo "✅ /auth/google/callback route exists"
    else
        echo "❌ /auth/google/callback route not found!"
    fi
else
    echo "❌ routes/web.php not found!"
fi

# Check frontend Login component
echo ""
echo "5️⃣  Checking frontend Login component..."
echo "=================================="

if [ -f "app/frontend/src/components/Auth/Login.jsx" ]; then
    if grep -q "Lanjutkan dengan Google" app/frontend/src/components/Auth/Login.jsx; then
        echo "✅ Google login button exists"
        
        if grep -q "auth/google/redirect" app/frontend/src/components/Auth/Login.jsx; then
            echo "✅ Google redirect URL is set"
        else
            echo "❌ Google redirect URL not found!"
        fi
    else
        echo "❌ Google login button not found!"
    fi
else
    echo "❌ Login.jsx not found!"
fi

# Check if Laravel Socialite is installed
echo ""
echo "6️⃣  Checking Laravel Socialite..."
echo "=================================="

if [ -f "app/backend/composer.json" ]; then
    if grep -q "laravel/socialite" app/backend/composer.json; then
        echo "✅ Laravel Socialite is in composer.json"
    else
        echo "❌ Laravel Socialite not found in composer.json!"
        echo "   Install with: composer require laravel/socialite"
    fi
else
    echo "❌ composer.json not found!"
fi

echo ""
echo "======================================"
echo "✅ Check Complete!"
echo "======================================"

