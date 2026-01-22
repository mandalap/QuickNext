#!/bin/bash

# Install Redis untuk Linux (QuickKasir POS System)
# Script ini akan membantu install Redis di Linux/VPS

echo "🚀 QuickKasir - Redis Installation Script"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or use sudo"
    echo "Usage: sudo ./install-redis-linux.sh"
    exit 1
fi

# Update package list
echo "📦 Updating package list..."
apt update

# Install Redis
echo ""
echo "📦 Installing Redis server..."
apt install -y redis-server

# Start Redis service
echo ""
echo "🚀 Starting Redis service..."
systemctl start redis-server

# Enable Redis on boot
echo ""
echo "⚙️  Enabling Redis on boot..."
systemctl enable redis-server

# Test Redis
echo ""
echo "🧪 Testing Redis connection..."
TEST_RESULT=$(redis-cli ping)

if [ "$TEST_RESULT" = "PONG" ]; then
    echo "✅ Redis installed and running successfully!"
    echo ""
    echo "Redis is now running on: 127.0.0.1:6379"
else
    echo "❌ Redis installation failed. Please check manually."
    exit 1
fi

# Configure Redis for production (optional)
echo ""
read -p "Do you want to configure Redis for production? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚙️  Configuring Redis for production..."
    
    # Backup original config
    cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
    
    # Set bind to localhost only
    sed -i 's/^# bind 127.0.0.1/bind 127.0.0.1/' /etc/redis/redis.conf
    
    # Set max memory (512MB)
    if ! grep -q "^maxmemory" /etc/redis/redis.conf; then
        echo "maxmemory 512mb" >> /etc/redis/redis.conf
        echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
    fi
    
    # Restart Redis
    systemctl restart redis-server
    
    echo "✅ Redis configured for production!"
fi

echo ""
echo "========================================"
echo "Next steps:"
echo "1. Update .env file with Redis configuration"
echo "2. Run: composer require predis/predis"
echo "3. Run: php artisan config:clear"
echo "4. Run: php artisan config:cache"
echo "5. Test with: ./scripts/test-redis.sh"
echo ""
