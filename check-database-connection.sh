#!/bin/bash

# Quick Database Connection Check Script (Linux/MacOS)

echo "🔍 Checking Database Connection..."
echo ""

# Check if MySQL service is running
echo "=== STEP 1: Check MySQL Service ==="
if systemctl is-active --quiet mysql 2>/dev/null || systemctl is-active --quiet mariadb 2>/dev/null; then
    echo "✅ MySQL/MariaDB service is running"
    systemctl status mysql --no-pager -l 2>/dev/null || systemctl status mariadb --no-pager -l 2>/dev/null
else
    echo "❌ MySQL/MariaDB service is not running"
    read -p "Do you want to start it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl start mysql 2>/dev/null || sudo systemctl start mariadb 2>/dev/null
        echo "✅ Service started!"
    fi
fi

echo ""

# Check port 3306
echo "=== STEP 2: Check Port 3306 ==="
if sudo lsof -i :3306 > /dev/null 2>&1 || sudo netstat -tulpn | grep :3306 > /dev/null 2>&1; then
    echo "✅ Port 3306 is in use (MySQL is likely running)"
    sudo lsof -i :3306 2>/dev/null || sudo netstat -tulpn | grep :3306
else
    echo "❌ Port 3306 is not in use (MySQL is not running)"
fi

echo ""

# Check .env file
echo "=== STEP 3: Check .env Configuration ==="
ENV_PATH="app/backend/.env"

if [ -f "$ENV_PATH" ]; then
    echo "✅ .env file found"
    
    DB_CONNECTION=$(grep "^DB_CONNECTION=" "$ENV_PATH" | cut -d '=' -f2)
    DB_HOST=$(grep "^DB_HOST=" "$ENV_PATH" | cut -d '=' -f2)
    DB_PORT=$(grep "^DB_PORT=" "$ENV_PATH" | cut -d '=' -f2)
    DB_DATABASE=$(grep "^DB_DATABASE=" "$ENV_PATH" | cut -d '=' -f2)
    DB_USERNAME=$(grep "^DB_USERNAME=" "$ENV_PATH" | cut -d '=' -f2)
    
    echo "DB_CONNECTION: $DB_CONNECTION"
    echo "DB_HOST: $DB_HOST"
    echo "DB_PORT: $DB_PORT"
    echo "DB_DATABASE: $DB_DATABASE"
    echo "DB_USERNAME: $DB_USERNAME"
    echo "DB_PASSWORD: [hidden]"
    
    if [ "$DB_CONNECTION" != "mysql" ]; then
        echo "⚠️  DB_CONNECTION is not 'mysql'"
    fi
else
    echo "❌ .env file not found at: $ENV_PATH"
    echo "Please create .env file from .env.example"
fi

echo ""

# Test MySQL connection
echo "=== STEP 4: Test MySQL Connection ==="
read -p "Do you want to test MySQL connection? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Testing connection..."
    echo "If prompted, enter your MySQL root password"
    
    if mysql -u root -p -e "SHOW DATABASES;" 2>/dev/null; then
        echo "✅ MySQL connection successful!"
    else
        echo "❌ MySQL connection failed!"
        echo "Please check your MySQL credentials"
    fi
fi

echo ""

# Clear Laravel cache
echo "=== STEP 5: Clear Laravel Cache ==="
read -p "Do you want to clear Laravel cache? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd app/backend || exit 1
    
    echo "Clearing config cache..."
    php artisan config:clear
    echo "Clearing application cache..."
    php artisan cache:clear
    echo "Clearing route cache..."
    php artisan route:clear
    echo "Clearing view cache..."
    php artisan view:clear
    echo "✅ Cache cleared!"
    
    cd ../..
fi

echo ""
echo "=== Summary ==="
echo "1. Check if MySQL service is running"
echo "2. Check if port 3306 is open"
echo "3. Verify .env configuration"
echo "4. Test MySQL connection"
echo "5. Clear Laravel cache"
echo ""
echo "For more details, see: FIX_DATABASE_CONNECTION.md"
