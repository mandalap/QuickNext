#!/bin/bash

# QuickKasir - Fix SMTP Connection Issues
# Troubleshoot and fix SMTP connection timeout problems

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="${PROJECT_DIR}/app/backend"
PHP_PATH="/usr/bin/php8.3"

echo "🔧 QuickKasir - SMTP Connection Fix"
echo "===================================="
echo ""

# Check if backend directory exists
if [ ! -d "${BACKEND_DIR}" ]; then
    echo -e "${RED}❌ Error: Backend directory not found: ${BACKEND_DIR}${NC}"
    exit 1
fi

cd "${BACKEND_DIR}"

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

echo "📋 Current Email Configuration:"
echo "================================"

# Get current email configuration
MAIL_MAILER=$(grep "^MAIL_MAILER=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_HOST=$(grep "^MAIL_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_PORT=$(grep "^MAIL_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_ENCRYPTION=$(grep "^MAIL_ENCRYPTION=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

echo "   Mailer: ${MAIL_MAILER:-'Not set'}"
echo "   Host: ${MAIL_HOST:-'Not set'}"
echo "   Port: ${MAIL_PORT:-'Not set'}"
echo "   Encryption: ${MAIL_ENCRYPTION:-'Not set'}"
echo ""

# Step 1: Test network connectivity
echo -e "${BLUE}Step 1: Testing network connectivity...${NC}"

# Test port 587 (TLS)
echo -n "   Testing smtp.gmail.com:587 (TLS)... "
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/587" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 587 is accessible${NC}"
    PORT_587_OK=true
else
    echo -e "${RED}❌ Port 587 is blocked or unreachable${NC}"
    PORT_587_OK=false
fi

# Test port 465 (SSL)
echo -n "   Testing smtp.gmail.com:465 (SSL)... "
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/465" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 465 is accessible${NC}"
    PORT_465_OK=true
else
    echo -e "${RED}❌ Port 465 is blocked or unreachable${NC}"
    PORT_465_OK=false
fi

# Test DNS resolution
echo -n "   Testing DNS resolution... "
if host smtp.gmail.com > /dev/null 2>&1; then
    echo -e "${GREEN}✅ DNS resolution OK${NC}"
    DNS_OK=true
else
    echo -e "${RED}❌ DNS resolution failed${NC}"
    DNS_OK=false
fi

echo ""

# Step 2: Check firewall
echo -e "${BLUE}Step 2: Checking firewall...${NC}"

if command -v ufw > /dev/null 2>&1; then
    UFW_STATUS=$(sudo ufw status | head -1)
    echo "   UFW Status: ${UFW_STATUS}"
    
    if echo "$UFW_STATUS" | grep -q "active"; then
        echo -e "${YELLOW}   ⚠️  UFW is active. Checking outbound rules...${NC}"
        # UFW typically allows outbound by default, but let's check
    fi
else
    echo "   UFW not installed"
fi

# Check iptables
if command -v iptables > /dev/null 2>&1; then
    echo "   Checking iptables rules..."
    IPTABLES_OUTPUT=$(sudo iptables -L OUTPUT -n 2>/dev/null | grep -i "smtp\|587\|465" || echo "No SMTP-specific rules found")
    if [ -n "$IPTABLES_OUTPUT" ]; then
        echo -e "${YELLOW}   ⚠️  Found iptables rules:${NC}"
        echo "   $IPTABLES_OUTPUT"
    fi
fi

echo ""

# Step 3: Provide solutions
echo -e "${BLUE}Step 3: Recommended Solutions${NC}"
echo "================================"

if [ "$PORT_587_OK" = false ] && [ "$PORT_465_OK" = false ]; then
    echo -e "${RED}❌ Both ports 587 and 465 are blocked!${NC}"
    echo ""
    echo "Possible causes:"
    echo "  1. VPS provider blocks outbound SMTP connections"
    echo "  2. Firewall is blocking outbound connections"
    echo "  3. Network restrictions"
    echo ""
    echo "Solutions:"
    echo ""
    echo -e "${YELLOW}Option 1: Use Port 465 (SSL) instead of 587 (TLS)${NC}"
    echo "   Some VPS providers allow port 465 but block 587"
    echo "   Run: bash scripts/switch-to-ssl-smtp-vps.sh"
    echo ""
    echo -e "${YELLOW}Option 2: Use alternative email service${NC}"
    echo "   - Mailgun (recommended for production)"
    echo "   - SendGrid"
    echo "   - Amazon SES"
    echo "   - Postmark"
    echo ""
    echo -e "${YELLOW}Option 3: Contact VPS provider${NC}"
    echo "   Ask them to unblock outbound SMTP ports (587/465)"
    echo ""
    echo -e "${YELLOW}Option 4: Use sendmail/postfix${NC}"
    echo "   Configure local mail server"
    echo ""
    
    read -p "Do you want to try switching to port 465 (SSL)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}Switching to port 465 (SSL)...${NC}"
        
        # Backup .env
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        
        # Update .env
        if grep -q "^MAIL_PORT=" .env; then
            sed -i 's/^MAIL_PORT=.*/MAIL_PORT=465/' .env
        else
            echo "MAIL_PORT=465" >> .env
        fi
        
        if grep -q "^MAIL_ENCRYPTION=" .env; then
            sed -i 's/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=ssl/' .env
        else
            echo "MAIL_ENCRYPTION=ssl" >> .env
        fi
        
        echo -e "${GREEN}✅ Updated .env to use port 465 (SSL)${NC}"
        echo ""
        echo "Testing new configuration..."
        
        # Clear config cache
        ${PHP_PATH} artisan config:clear > /dev/null 2>&1
        
        # Test connection
        echo -n "   Testing connection to smtp.gmail.com:465... "
        if timeout 10 bash -c "echo > /dev/tcp/smtp.gmail.com/465" 2>/dev/null; then
            echo -e "${GREEN}✅ Port 465 is accessible${NC}"
            echo ""
            echo -e "${GREEN}✅ Configuration updated!${NC}"
            echo "   Run: bash scripts/test-email-vps.sh"
        else
            echo -e "${RED}❌ Port 465 is still blocked${NC}"
            echo ""
            echo "You may need to:"
            echo "  1. Contact your VPS provider"
            echo "  2. Use an alternative email service"
            echo "  3. Configure local mail server"
        fi
    fi
    
elif [ "$PORT_587_OK" = false ] && [ "$PORT_465_OK" = true ]; then
    echo -e "${YELLOW}⚠️  Port 587 is blocked, but port 465 is accessible${NC}"
    echo ""
    echo "Solution: Switch to port 465 (SSL)"
    echo ""
    
    read -p "Do you want to switch to port 465 (SSL)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup .env
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        
        # Update .env
        if grep -q "^MAIL_PORT=" .env; then
            sed -i 's/^MAIL_PORT=.*/MAIL_PORT=465/' .env
        else
            echo "MAIL_PORT=465" >> .env
        fi
        
        if grep -q "^MAIL_ENCRYPTION=" .env; then
            sed -i 's/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=ssl/' .env
        else
            echo "MAIL_ENCRYPTION=ssl" >> .env
        fi
        
        echo -e "${GREEN}✅ Updated .env to use port 465 (SSL)${NC}"
        echo "   Run: bash scripts/test-email-vps.sh"
    fi
    
elif [ "$PORT_587_OK" = true ]; then
    echo -e "${GREEN}✅ Port 587 is accessible${NC}"
    echo ""
    echo "The connection timeout might be due to:"
    echo "  1. Incorrect credentials"
    echo "  2. Gmail App Password not set correctly"
    echo "  3. Two-factor authentication not enabled"
    echo "  4. Network latency"
    echo ""
    echo "Let's check your configuration..."
    echo ""
    
    # Check if MAIL_ENCRYPTION is set
    if [ -z "$MAIL_ENCRYPTION" ] || [ "$MAIL_ENCRYPTION" != "tls" ]; then
        echo -e "${YELLOW}⚠️  MAIL_ENCRYPTION is not set to 'tls'${NC}"
        echo "   For port 587, you should use 'tls'"
        echo ""
        
        read -p "Do you want to set MAIL_ENCRYPTION=tls? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Backup .env
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
            
            if grep -q "^MAIL_ENCRYPTION=" .env; then
                sed -i 's/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=tls/' .env
            else
                echo "MAIL_ENCRYPTION=tls" >> .env
            fi
            
            echo -e "${GREEN}✅ Updated MAIL_ENCRYPTION=tls${NC}"
            echo "   Run: bash scripts/test-email-vps.sh"
        fi
    fi
fi

echo ""
echo -e "${GREEN}=========================="
echo "✅ SMTP Connection Fix Completed!"
echo "==========================${NC}"
echo ""
echo "Next steps:"
echo "  1. Test email: bash scripts/test-email-vps.sh"
echo "  2. Check logs: tail -50 storage/logs/laravel.log"
echo "  3. Verify credentials in .env file"
echo ""
