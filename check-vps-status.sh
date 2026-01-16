#!/bin/bash

echo "=========================================="
echo "🔍 QUICKKASIR VPS STATUS CHECK"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. PM2 Status
echo "📦 1. PM2 PROCESSES STATUS"
echo "----------------------------------------"
pm2 status
echo ""

# 2. Nginx Status
echo "🌐 2. NGINX STATUS"
echo "----------------------------------------"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx is not running${NC}"
fi
sudo systemctl status nginx --no-pager | head -5
echo ""

# 3. SSL Certificates
echo "🔒 3. SSL CERTIFICATES"
echo "----------------------------------------"
sudo certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry Date" | head -20
echo ""

# 4. Test HTTP/HTTPS Connections
echo "🌍 4. HTTP/HTTPS CONNECTION TEST"
echo "----------------------------------------"

domains=("www.quickkasir.com" "app.quickkasir.com" "admin.quickkasir.com" "api.quickkasir.com")

for domain in "${domains[@]}"; do
    echo -n "Testing $domain (HTTP): "
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://$domain" 2>/dev/null)
    if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        echo -e "${GREEN}✓ $http_code${NC}"
    else
        echo -e "${RED}✗ $http_code${NC}"
    fi
    
    echo -n "Testing $domain (HTTPS): "
    https_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 -k "https://$domain" 2>/dev/null)
    if [ "$https_code" = "200" ] || [ "$https_code" = "301" ] || [ "$https_code" = "302" ]; then
        echo -e "${GREEN}✓ $https_code${NC}"
    else
        echo -e "${RED}✗ $https_code${NC}"
    fi
done
echo ""

# 5. Port Status
echo "🔌 5. PORT STATUS"
echo "----------------------------------------"
echo -n "Port 80 (HTTP): "
if sudo netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo -e "${GREEN}✓ Listening${NC}"
else
    echo -e "${RED}✗ Not listening${NC}"
fi

echo -n "Port 443 (HTTPS): "
if sudo netstat -tlnp 2>/dev/null | grep -q ":443 "; then
    echo -e "${GREEN}✓ Listening${NC}"
else
    echo -e "${RED}✗ Not listening${NC}"
fi

echo -n "Port 3001 (Landing): "
if sudo netstat -tlnp 2>/dev/null | grep -q ":3001 "; then
    echo -e "${GREEN}✓ Listening${NC}"
else
    echo -e "${RED}✗ Not listening${NC}"
fi

echo -n "Port 8000 (Backend): "
if sudo netstat -tlnp 2>/dev/null | grep -q ":8000 "; then
    echo -e "${GREEN}✓ Listening${NC}"
else
    echo -e "${RED}✗ Not listening${NC}"
fi
echo ""

# 6. Disk Space
echo "💾 6. DISK SPACE"
echo "----------------------------------------"
df -h / | tail -1 | awk '{print "Used: " $3 " / " $2 " (" $5 ")"}'
echo ""

# 7. Memory Usage
echo "🧠 7. MEMORY USAGE"
echo "----------------------------------------"
free -h | grep Mem | awk '{print "Used: " $3 " / " $2 " (" $3/$2*100 "%)"}'
echo ""

# 8. Recent PM2 Errors
echo "⚠️  8. RECENT PM2 ERRORS (Last 5 lines)"
echo "----------------------------------------"
pm2 logs --lines 5 --nostream --err 2>/dev/null | tail -5 || echo "No errors found"
echo ""

# 9. Nginx Error Log (Last 5 lines)
echo "⚠️  9. RECENT NGINX ERRORS (Last 5 lines)"
echo "----------------------------------------"
sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No errors found"
echo ""

# 10. Build Files Check
echo "📁 10. BUILD FILES CHECK"
echo "----------------------------------------"
echo -n "Frontend build: "
if [ -f "/var/www/quickkasir/app/frontend/build/index.html" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
fi

echo -n "Landing .next: "
if [ -d "/var/www/quickkasir/app/beranda/.next" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
fi
echo ""

# 11. Environment Variables Check
echo "🔐 11. ENVIRONMENT VARIABLES CHECK"
echo "----------------------------------------"
echo -n "Backend .env: "
if [ -f "/var/www/quickkasir/app/backend/.env" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
    if grep -q "APP_DEBUG=true" /var/www/quickkasir/app/backend/.env 2>/dev/null; then
        echo -e "  ${YELLOW}⚠ APP_DEBUG=true (should be false in production)${NC}"
    fi
else
    echo -e "${RED}✗ Missing${NC}"
fi

echo -n "Frontend .env: "
if [ -f "/var/www/quickkasir/app/frontend/.env.production" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
else
    echo -e "${YELLOW}⚠ .env.production not found${NC}"
fi

echo -n "Landing .env: "
if [ -f "/var/www/quickkasir/app/beranda/.env.production" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
else
    echo -e "${YELLOW}⚠ .env.production not found${NC}"
fi
echo ""

# 12. File Permissions
echo "🔐 12. FILE PERMISSIONS CHECK"
echo "----------------------------------------"
echo -n "Backend storage: "
if [ -w "/var/www/quickkasir/app/backend/storage" ]; then
    echo -e "${GREEN}✓ Writable${NC}"
else
    echo -e "${RED}✗ Not writable${NC}"
fi

echo -n "Backend bootstrap/cache: "
if [ -w "/var/www/quickkasir/app/backend/bootstrap/cache" ]; then
    echo -e "${GREEN}✓ Writable${NC}"
else
    echo -e "${RED}✗ Not writable${NC}"
fi
echo ""

echo "=========================================="
echo "✅ STATUS CHECK COMPLETE"
echo "=========================================="
