#!/bin/bash

# QuickKasir - Complete VPS Deployment Script
# Script ini akan deploy aplikasi dari GitHub ke VPS

set -e  # Exit on error

echo "🚀 QuickKasir - VPS Deployment Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
REPO_URL="https://github.com/mandalap/QuickNext.git"
BRANCH="development"  # atau "main" untuk production

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Script perlu dijalankan dengan sudo${NC}"
    echo "Usage: sudo bash scripts/deploy-to-vps.sh"
    exit 1
fi

echo "📋 Configuration:"
echo "   Project Directory: $PROJECT_DIR"
echo "   Repository: $REPO_URL"
echo "   Branch: $BRANCH"
echo ""

# Step 1: Install Required Packages
echo -e "${YELLOW}Step 1: Installing required packages...${NC}"
apt update -qq
apt install -y git curl wget unzip

# Check PHP
if ! command -v php &> /dev/null; then
    echo -e "${YELLOW}Installing PHP 8.2...${NC}"
    apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip php8.2-gd
fi

# Check Composer
if ! command -v composer &> /dev/null; then
    echo -e "${YELLOW}Installing Composer...${NC}"
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
    chmod +x /usr/local/bin/composer
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js 18...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}Installing MySQL...${NC}"
    apt install -y mysql-server
fi

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Installing Nginx...${NC}"
    apt install -y nginx
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
fi

echo -e "${GREEN}✅ Required packages installed!${NC}"
echo ""

# Step 2: Clone or Update Repository
echo -e "${YELLOW}Step 2: Setting up project directory...${NC}"

if [ -d "$PROJECT_DIR" ]; then
    echo "📦 Project directory exists, updating from GitHub..."
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
    git clean -fd
else
    echo "📦 Cloning repository..."
    mkdir -p "$(dirname $PROJECT_DIR)"
    git clone -b $BRANCH $REPO_URL "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo -e "${GREEN}✅ Repository updated!${NC}"
echo ""

# Step 3: Setup Backend
echo -e "${YELLOW}Step 3: Setting up Backend (Laravel)...${NC}"
cd "$PROJECT_DIR/app/backend"

# Install dependencies
echo "📦 Installing Composer dependencies..."
composer install --optimize-autoloader --no-dev --no-interaction

# Setup .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    php artisan key:generate
    echo -e "${YELLOW}⚠️  Please configure .env file manually!${NC}"
else
    echo "✅ .env file exists"
fi

# Set permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

echo -e "${GREEN}✅ Backend setup complete!${NC}"
echo ""

# Step 4: Setup Frontend
echo -e "${YELLOW}Step 4: Setting up Frontend (React)...${NC}"
cd "$PROJECT_DIR/app/frontend"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install --production

# Build production
echo "🏗️  Building production bundle..."
npm run build

echo -e "${GREEN}✅ Frontend setup complete!${NC}"
echo ""

# Step 5: Setup Landing Page (Optional)
if [ -d "$PROJECT_DIR/app/beranda" ]; then
    echo -e "${YELLOW}Step 5: Setting up Landing Page (Next.js)...${NC}"
    cd "$PROJECT_DIR/app/beranda"
    
    # Install dependencies
    echo "📦 Installing npm dependencies..."
    npm install --production
    
    # Build production
    echo "🏗️  Building production bundle..."
    npm run build
    
    echo -e "${GREEN}✅ Landing page setup complete!${NC}"
    echo ""
fi

# Step 6: Setup Redis (Optional)
if command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}Step 6: Setting up Redis...${NC}"
    cd "$PROJECT_DIR"
    
    if [ -f "scripts/setup-redis-vps.sh" ]; then
        bash scripts/setup-redis-vps.sh
    else
        echo "⚠️  Redis setup script not found, skipping..."
    fi
    echo ""
fi

# Step 7: Run Migrations
echo -e "${YELLOW}Step 7: Running database migrations...${NC}"
cd "$PROJECT_DIR/app/backend"

if [ -f .env ]; then
    echo "🔄 Running migrations..."
    php artisan migrate --force || echo "⚠️  Migration failed, please check database configuration"
else
    echo -e "${RED}⚠️  .env file not found, skipping migrations${NC}"
    echo "   Please configure .env and run: php artisan migrate --force"
fi

echo ""

# Step 8: Cache Configuration
echo -e "${YELLOW}Step 8: Caching Laravel configuration...${NC}"
cd "$PROJECT_DIR/app/backend"

php artisan config:cache || echo "⚠️  Config cache failed"
php artisan route:cache || echo "⚠️  Route cache failed"
php artisan view:cache || echo "⚠️  View cache failed"

echo -e "${GREEN}✅ Configuration cached!${NC}"
echo ""

# Summary
echo "======================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. Configure .env file:"
echo "   nano $PROJECT_DIR/app/backend/.env"
echo ""
echo "2. Configure database:"
echo "   - Create database and user"
echo "   - Update DB_* variables in .env"
echo "   - Run: php artisan migrate --force"
echo ""
echo "3. Configure Nginx:"
echo "   - Setup virtual hosts for each subdomain"
echo "   - Configure SSL certificates"
echo ""
echo "4. Start services:"
echo "   - Backend: php artisan serve (or use PM2)"
echo "   - Frontend: serve build folder with Nginx"
echo "   - Landing: pm2 start npm --name landing -- start"
echo ""
echo "📚 Documentation:"
echo "   - DEPLOYMENT_GUIDE.md"
echo "   - DEPLOYMENT_QUICK_GUIDE.md"
echo ""
