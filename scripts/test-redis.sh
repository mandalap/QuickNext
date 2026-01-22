#!/bin/bash

# Test Redis Connection (QuickKasir POS System)
# Script ini akan test koneksi Redis dan konfigurasi Laravel

echo "🧪 QuickKasir - Redis Connection Test"
echo "====================================="
echo ""

# Test 1: Redis Server Connection
echo "Test 1: Redis Server Connection"
echo "--------------------------------"

REDIS_TEST=$(redis-cli ping 2>&1)

if [ "$REDIS_TEST" = "PONG" ]; then
    echo "✅ Redis server is running!"
    echo "   Response: $REDIS_TEST"
else
    echo "❌ Redis server is not responding"
    echo "   Response: $REDIS_TEST"
    echo ""
    echo "💡 Tip: Make sure Redis is running:"
    echo "   sudo systemctl start redis-server"
fi

echo ""

# Test 2: Laravel Configuration
echo "Test 2: Laravel Configuration"
echo "--------------------------------"

ENV_FILE="app/backend/.env"

if [ -f "$ENV_FILE" ]; then
    # Check CACHE_STORE
    if grep -q "CACHE_STORE=redis" "$ENV_FILE"; then
        echo "✅ CACHE_STORE is set to redis"
    else
        echo "⚠️  CACHE_STORE is not set to redis"
        CACHE_STORE=$(grep "CACHE_STORE=" "$ENV_FILE" | cut -d '=' -f2)
        echo "   Current value: $CACHE_STORE"
    fi
    
    # Check SESSION_DRIVER
    if grep -q "SESSION_DRIVER=redis" "$ENV_FILE"; then
        echo "✅ SESSION_DRIVER is set to redis"
    else
        echo "⚠️  SESSION_DRIVER is not set to redis"
        SESSION_DRIVER=$(grep "SESSION_DRIVER=" "$ENV_FILE" | cut -d '=' -f2)
        echo "   Current value: $SESSION_DRIVER"
    fi
    
    # Check QUEUE_CONNECTION
    if grep -q "QUEUE_CONNECTION=redis" "$ENV_FILE"; then
        echo "✅ QUEUE_CONNECTION is set to redis"
    else
        echo "⚠️  QUEUE_CONNECTION is not set to redis"
        QUEUE_CONNECTION=$(grep "QUEUE_CONNECTION=" "$ENV_FILE" | cut -d '=' -f2)
        echo "   Current value: $QUEUE_CONNECTION"
    fi
    
    # Check REDIS_HOST
    if grep -q "REDIS_HOST" "$ENV_FILE"; then
        REDIS_HOST=$(grep "REDIS_HOST=" "$ENV_FILE" | cut -d '=' -f2)
        echo "✅ REDIS_HOST is configured: $REDIS_HOST"
    else
        echo "⚠️  REDIS_HOST is not configured"
    fi
else
    echo "❌ .env file not found at: $ENV_FILE"
fi

echo ""

# Test 3: Laravel Tinker Test
echo "Test 3: Laravel Cache Test"
echo "--------------------------------"

ARTISAN_PATH="app/backend/artisan"

if [ -f "$ARTISAN_PATH" ]; then
    echo "Running Laravel cache test..."
    
    cd app/backend
    
    # Test cache via artisan
    CACHE_TEST=$(php artisan tinker --execute="Cache::put('test_redis_connection', 'success', 60); echo Cache::get('test_redis_connection');" 2>&1)
    
    if echo "$CACHE_TEST" | grep -q "success"; then
        echo "✅ Laravel cache is working with Redis!"
    else
        echo "⚠️  Laravel cache test failed"
        echo "   Output: $CACHE_TEST"
        echo ""
        echo "💡 Try running manually:"
        echo "   php artisan tinker"
        echo "   Cache::put('test', 'value', 60);"
        echo "   Cache::get('test');"
    fi
    
    cd ../..
else
    echo "⚠️  Laravel artisan not found. Skipping Laravel test."
fi

echo ""
echo "====================================="
echo "Test completed!"
echo ""
