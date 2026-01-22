#!/bin/bash

# QuickKasir - Deployment Verification Script
# Script untuk cek apakah deployment berhasil atau tidak

echo "🔍 QuickKasir - Deployment Verification"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/var/www/kasir-pos"
VPS_IP="103.59.95.78"

# Counters
PASSED=0
FAILED=0

# Function to check
check() {
    local name=$1
    local command=$2
    
    echo -n "Checking $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check with message
check_msg() {
    local name=$1
    local command=$2
    local success_msg=$3
    local fail_msg=$4
    
    echo -n "Checking $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC} - $success_msg"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - $fail_msg"
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}📋 System Requirements Check${NC}"
echo "-----------------------------------"

# Check PHP 8.3
PHP_VERSION=$(php -v 2>/dev/null | head -n 1 | grep -oP 'PHP \K[0-9]+\.[0-9]+')
if [ ! -z "$PHP_VERSION" ]; then
    if [ "$(echo "$PHP_VERSION >= 8.3" | bc -l 2>/dev/null || echo "0")" = "1" ] || [ "$PHP_VERSION" = "8.3" ]; then
        echo -e "PHP Version: ${GREEN}✅ $PHP_VERSION${NC}"
        ((PASSED++))
    else
        echo -e "PHP Version: ${RED}❌ $PHP_VERSION (Need 8.3+)${NC}"
        ((FAILED++))
    fi
else
    echo -e "PHP: ${RED}❌ NOT INSTALLED${NC}"
    ((FAILED++))
fi

# Check Composer
check "Composer" "command -v composer"
if [ $? -eq 0 ]; then
    COMPOSER_VERSION=$(composer --version 2>/dev/null | head -n 1)
    echo "  └─ $COMPOSER_VERSION"
fi

# Check Node.js
NODE_VERSION=$(node -v 2>/dev/null)
if [ ! -z "$NODE_VERSION" ]; then
    echo -e "Node.js: ${GREEN}✅ $NODE_VERSION${NC}"
    ((PASSED++))
else
    echo -e "Node.js: ${RED}❌ NOT INSTALLED${NC}"
    ((FAILED++))
fi

# Check npm
NPM_VERSION=$(npm -v 2>/dev/null)
if [ ! -z "$NPM_VERSION" ]; then
    echo -e "npm: ${GREEN}✅ v$NPM_VERSION${NC}"
    ((PASSED++))
else
    echo -e "npm: ${RED}❌ NOT INSTALLED${NC}"
    ((FAILED++))
fi

# Check MySQL
check "MySQL" "systemctl is-active --quiet mysql"
if [ $? -eq 0 ]; then
    MYSQL_VERSION=$(mysql --version 2>/dev/null | head -n 1)
    echo "  └─ $MYSQL_VERSION"
fi

# Check Nginx
check "Nginx" "systemctl is-active --quiet nginx"
if [ $? -eq 0 ]; then
    NGINX_VERSION=$(nginx -v 2>&1 | head -n 1)
    echo "  └─ $NGINX_VERSION"
fi

# Check PM2
check "PM2" "command -v pm2"
if [ $? -eq 0 ]; then
    PM2_VERSION=$(pm2 -v 2>/dev/null)
    echo "  └─ v$PM2_VERSION"
fi

# Check Redis
check "Redis" "systemctl is-active --quiet redis-server"
if [ $? -eq 0 ]; then
    REDIS_VERSION=$(redis-server --version 2>/dev/null | head -n 1)
    echo "  └─ $REDIS_VERSION"
fi

echo ""
echo -e "${BLUE}📁 Project Structure Check${NC}"
echo "-----------------------------------"

# Check project directory
check "Project Directory" "[ -d '$PROJECT_DIR' ]"
check "Backend Directory" "[ -d '$PROJECT_DIR/app/backend' ]"
check "Frontend Directory" "[ -d '$PROJECT_DIR/app/frontend' ]"
check "Landing Directory" "[ -d '$PROJECT_DIR/app/beranda' ]"

echo ""
echo -e "${BLUE}📦 Backend (Laravel) Check${NC}"
echo "-----------------------------------"

# Check backend files
check "Backend .env" "[ -f '$PROJECT_DIR/app/backend/.env' ]"
check "Backend vendor" "[ -d '$PROJECT_DIR/app/backend/vendor' ]"
check "Backend storage permissions" "[ -w '$PROJECT_DIR/app/backend/storage' ]"

# Check Laravel key
if [ -f "$PROJECT_DIR/app/backend/.env" ]; then
    if grep -q "APP_KEY=base64:" "$PROJECT_DIR/app/backend/.env" 2>/dev/null; then
        echo -e "Laravel APP_KEY: ${GREEN}✅ SET${NC}"
        ((PASSED++))
    else
        echo -e "Laravel APP_KEY: ${RED}❌ NOT SET${NC}"
        ((FAILED++))
    fi
fi

# Check database connection
if [ -f "$PROJECT_DIR/app/backend/.env" ]; then
    DB_HOST=$(grep "^DB_HOST=" "$PROJECT_DIR/app/backend/.env" 2>/dev/null | cut -d '=' -f2)
    DB_DATABASE=$(grep "^DB_DATABASE=" "$PROJECT_DIR/app/backend/.env" 2>/dev/null | cut -d '=' -f2)
    DB_USERNAME=$(grep "^DB_USERNAME=" "$PROJECT_DIR/app/backend/.env" 2>/dev/null | cut -d '=' -f2)
    
    if [ ! -z "$DB_DATABASE" ] && [ "$DB_DATABASE" != "" ]; then
        echo -e "Database Config: ${GREEN}✅ FOUND${NC}"
        echo "  └─ Database: $DB_DATABASE"
        ((PASSED++))
        
        # Try to connect
        if mysql -u "$DB_USERNAME" -p"$(grep "^DB_PASSWORD=" "$PROJECT_DIR/app/backend/.env" 2>/dev/null | cut -d '=' -f2)" -e "USE $DB_DATABASE;" 2>/dev/null; then
            echo -e "Database Connection: ${GREEN}✅ SUCCESS${NC}"
            ((PASSED++))
        else
            echo -e "Database Connection: ${YELLOW}⚠️  CANNOT VERIFY (check password)${NC}"
        fi
    else
        echo -e "Database Config: ${RED}❌ NOT CONFIGURED${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo -e "${BLUE}⚛️  Frontend (React) Check${NC}"
echo "-----------------------------------"

# Check frontend build
check "Frontend build directory" "[ -d '$PROJECT_DIR/app/frontend/build' ]"
check "Frontend index.html" "[ -f '$PROJECT_DIR/app/frontend/build/index.html' ]"
check "Frontend .env.production" "[ -f '$PROJECT_DIR/app/frontend/.env.production' ]"

# Check frontend .env.production content
if [ -f "$PROJECT_DIR/app/frontend/.env.production" ]; then
    if grep -q "$VPS_IP" "$PROJECT_DIR/app/frontend/.env.production" 2>/dev/null; then
        echo -e "Frontend IP Config: ${GREEN}✅ CORRECT ($VPS_IP)${NC}"
        ((PASSED++))
    else
        echo -e "Frontend IP Config: ${RED}❌ WRONG IP${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo -e "${BLUE}🌐 Landing Page (Next.js) Check${NC}"
echo "-----------------------------------"

# Check landing page build
if [ -d "$PROJECT_DIR/app/beranda" ]; then
    check "Landing build directory" "[ -d '$PROJECT_DIR/app/beranda/.next' ]"
else
    echo -e "Landing Page: ${YELLOW}⚠️  NOT FOUND (optional)${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Services Check${NC}"
echo "-----------------------------------"

# Check PM2 processes
PM2_COUNT=$(pm2 list 2>/dev/null | grep -c "quickkasir" || echo "0")
PM2_COUNT=$(echo "$PM2_COUNT" | tr -d '\n\r' | sed 's/[^0-9]//g')
[ -z "$PM2_COUNT" ] && PM2_COUNT=0
if [ "$PM2_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "PM2 Processes: ${GREEN}✅ $PM2_COUNT running${NC}"
    pm2 list | grep quickkasir
    ((PASSED++))
else
    echo -e "PM2 Processes: ${RED}❌ NONE RUNNING${NC}"
    ((FAILED++))
fi

# Check Nginx config
if [ -f "/etc/nginx/sites-enabled/kasir-pos" ]; then
    echo -e "Nginx Config: ${GREEN}✅ FOUND${NC}"
    ((PASSED++))
    
    # Check nginx syntax
    if nginx -t 2>/dev/null; then
        echo -e "Nginx Syntax: ${GREEN}✅ VALID${NC}"
        ((PASSED++))
    else
        echo -e "Nginx Syntax: ${RED}❌ INVALID${NC}"
        ((FAILED++))
    fi
else
    echo -e "Nginx Config: ${RED}❌ NOT FOUND${NC}"
    ((FAILED++))
fi

# Check PHP-FPM
check "PHP-FPM Service" "systemctl is-active --quiet php8.3-fpm"

# Check Redis connection
if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo -e "Redis Connection: ${GREEN}✅ SUCCESS${NC}"
        ((PASSED++))
    else
        echo -e "Redis Connection: ${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo -e "${BLUE}🌐 Network Access Check${NC}"
echo "-----------------------------------"

# Check ports
check_port() {
    local port=$1
    local name=$2
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "Port $port ($name): ${GREEN}✅ LISTENING${NC}"
        ((PASSED++))
    else
        echo -e "Port $port ($name): ${RED}❌ NOT LISTENING${NC}"
        ((FAILED++))
    fi
}

check_port 8000 "Backend API"
check_port 3000 "Frontend"
check_port 3001 "Landing Page"

# Test HTTP endpoints
echo ""
echo "Testing HTTP endpoints..."
if curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP:8000" | grep -q "200\|301\|302"; then
    echo -e "Backend API (http://$VPS_IP:8000): ${GREEN}✅ ACCESSIBLE${NC}"
    ((PASSED++))
else
    echo -e "Backend API (http://$VPS_IP:8000): ${RED}❌ NOT ACCESSIBLE${NC}"
    ((FAILED++))
fi

if curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP:3000" | grep -q "200\|301\|302"; then
    echo -e "Frontend (http://$VPS_IP:3000): ${GREEN}✅ ACCESSIBLE${NC}"
    ((PASSED++))
else
    echo -e "Frontend (http://$VPS_IP:3000): ${RED}❌ NOT ACCESSIBLE${NC}"
    ((FAILED++))
fi

echo ""
echo "========================================"
echo -e "${BLUE}📊 Summary${NC}"
echo "========================================"
echo -e "Total Checks: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Deployment successful!${NC}"
    exit 0
elif [ $FAILED -le 3 ]; then
    echo -e "${YELLOW}⚠️  Some checks failed. Review the output above.${NC}"
    exit 1
else
    echo -e "${RED}❌ Multiple checks failed. Deployment may be incomplete.${NC}"
    exit 1
fi
