#!/bin/bash

# QuickKasir - Complete Redis Setup Script untuk VPS Ubuntu
# Script ini akan install Redis, Predis, update .env, dan test koneksi

set -e  # Exit on error

echo "🚀 QuickKasir - Redis Complete Setup"
echo "====================================="
echo ""

# Check if running as root for Redis install
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Script perlu dijalankan dengan sudo untuk install Redis"
    echo "Usage: sudo bash scripts/setup-redis-vps.sh"
    exit 1
fi

# Step 1: Install Redis
echo "📦 Step 1: Installing Redis server..."
apt update -qq
apt install -y redis-server

# Start & Enable Redis
echo "🚀 Starting Redis service..."
systemctl start redis-server
systemctl enable redis-server

# Test Redis
REDIS_TEST=$(redis-cli ping 2>&1)
if [ "$REDIS_TEST" = "PONG" ]; then
    echo "✅ Redis installed and running!"
else
    echo "❌ Redis installation failed"
    exit 1
fi

echo ""

# Step 2: Install Predis (run as regular user, not root)
echo "📦 Step 2: Installing Predis package..."
cd /var/www/kasir-pos/app/backend

# Switch to www-data user untuk install composer packages
sudo -u www-data composer require predis/predis --no-interaction --quiet || {
    echo "⚠️  Trying with current user..."
    composer require predis/predis --no-interaction --quiet
}

echo "✅ Predis installed!"
echo ""

# Step 3: Update .env
echo "⚙️  Step 3: Updating .env file..."
ENV_FILE="/var/www/kasir-pos/app/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found at $ENV_FILE"
    echo "💡 Please create .env file first: cp .env.example .env"
    exit 1
fi

# Backup .env
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Add Redis config jika belum ada
if ! grep -q "^REDIS_CLIENT=" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Redis Configuration" >> "$ENV_FILE"
    echo "REDIS_CLIENT=predis" >> "$ENV_FILE"
    echo "REDIS_HOST=127.0.0.1" >> "$ENV_FILE"
    echo "REDIS_PORT=6379" >> "$ENV_FILE"
    echo "REDIS_PASSWORD=null" >> "$ENV_FILE"
    echo "REDIS_DB=0" >> "$ENV_FILE"
    echo "REDIS_CACHE_DB=1" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Cache using Redis" >> "$ENV_FILE"
    echo "CACHE_STORE=redis" >> "$ENV_FILE"
    echo "CACHE_PREFIX=quickkasir-cache-" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Session using Redis" >> "$ENV_FILE"
    echo "SESSION_DRIVER=redis" >> "$ENV_FILE"
    echo "SESSION_LIFETIME=120" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Queue using Redis" >> "$ENV_FILE"
    echo "QUEUE_CONNECTION=redis" >> "$ENV_FILE"
    echo "✅ Redis config added to .env"
else
    echo "⚠️  Redis config already exists in .env, updating to use Predis..."
fi

# Always force Predis (we install it; phpredis needs php8.3-redis extension)
# Avoids "Class Redis not found" when extension is missing
sed -i 's/^REDIS_CLIENT=.*/REDIS_CLIENT=predis/' "$ENV_FILE" 2>/dev/null || true
sed -i 's/^CACHE_STORE=.*/CACHE_STORE=redis/' "$ENV_FILE" 2>/dev/null || true
sed -i 's/^SESSION_DRIVER=.*/SESSION_DRIVER=redis/' "$ENV_FILE" 2>/dev/null || true
sed -i 's/^QUEUE_CONNECTION=.*/QUEUE_CONNECTION=redis/' "$ENV_FILE" 2>/dev/null || true

echo ""

# Step 4: Clear & Rebuild Config
echo "🔄 Step 4: Clearing and rebuilding Laravel config..."
cd /var/www/kasir-pos/app/backend

sudo -u www-data php artisan config:clear 2>/dev/null || php artisan config:clear
sudo -u www-data php artisan cache:clear 2>/dev/null || php artisan cache:clear
sudo -u www-data php artisan config:cache 2>/dev/null || php artisan config:cache

echo "✅ Config cleared and cached!"
echo ""

# Step 5: Test Connection
echo "🧪 Step 5: Testing Redis connection..."
cd /var/www/kasir-pos/app/backend

# Test via Laravel Tinker
CACHE_TEST=$(sudo -u www-data php artisan tinker --execute="Cache::put('test_redis_vps', 'success', 60); echo Cache::get('test_redis_vps');" 2>&1) || {
    CACHE_TEST=$(php artisan tinker --execute="Cache::put('test_redis_vps', 'success', 60); echo Cache::get('test_redis_vps');" 2>&1)
}

if echo "$CACHE_TEST" | grep -q "success"; then
    echo "✅ Laravel cache is working with Redis!"
else
    echo "⚠️  Laravel cache test failed"
    echo "   Output: $CACHE_TEST"
    echo ""
    echo "💡 Try running manually:"
    echo "   cd /var/www/kasir-pos/app/backend"
    echo "   php artisan tinker"
    echo "   Cache::put('test', 'value', 60);"
    echo "   Cache::get('test');"
fi

echo ""
echo "====================================="
echo "✅ Redis setup completed!"
echo ""
echo "Next steps:"
echo "1. Make sure Redis is running: sudo systemctl status redis-server"
echo "2. Test manually: redis-cli ping (should return PONG)"
echo "3. Start queue worker: php artisan queue:work"
echo ""
