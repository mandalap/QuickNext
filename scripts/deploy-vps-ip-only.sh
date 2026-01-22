#!/bin/bash

# QuickKasir - VPS Deployment Script (IP Only, No Domain)
# Untuk Ubuntu 24.04 dengan PHP 8.3 dan PM2

set -e  # Exit on error

echo "🚀 QuickKasir - VPS Deployment (IP Only)"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
REPO_URL="https://github.com/mandalap/QuickNext.git"
BRANCH="development"
VPS_IP=""  # Will be detected automatically

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Script perlu dijalankan dengan sudo${NC}"
    echo "Usage: sudo bash scripts/deploy-vps-ip-only.sh"
    exit 1
fi

# Detect VPS IP
VPS_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Project Directory: $PROJECT_DIR"
echo "   Repository: $REPO_URL"
echo "   Branch: $BRANCH"
echo "   VPS IP: $VPS_IP"
echo ""

# Step 1: Update System
echo -e "${YELLOW}Step 1: Updating system...${NC}"
apt update -qq
apt upgrade -y -qq

echo -e "${GREEN}✅ System updated!${NC}"
echo ""

# Step 2: Install PHP 8.3
echo -e "${YELLOW}Step 2: Installing PHP 8.3...${NC}"

# Add PHP repository
apt install -y software-properties-common
add-apt-repository -y ppa:ondrej/php
apt update -qq

# Install PHP 8.3 and extensions
apt install -y php8.3 php8.3-cli php8.3-fpm php8.3-mysql php8.3-mbstring \
    php8.3-xml php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl

# Verify PHP version
PHP_VERSION=$(php -v | head -n 1)
echo -e "${GREEN}✅ PHP installed: $PHP_VERSION${NC}"
echo ""

# Step 3: Install Composer
echo -e "${YELLOW}Step 3: Installing Composer...${NC}"
if ! command -v composer &> /dev/null; then
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
    chmod +x /usr/local/bin/composer
    echo -e "${GREEN}✅ Composer installed!${NC}"
else
    echo -e "${GREEN}✅ Composer already installed${NC}"
fi
echo ""

# Step 4: Install Node.js 18
echo -e "${YELLOW}Step 4: Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✅ Node.js installed: $(node -v)${NC}"
else
    echo -e "${GREEN}✅ Node.js already installed: $(node -v)${NC}"
fi
echo ""

# Step 5: Install MySQL
echo -e "${YELLOW}Step 5: Installing MySQL...${NC}"
if ! command -v mysql &> /dev/null; then
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
    echo -e "${GREEN}✅ MySQL installed!${NC}"
    echo -e "${YELLOW}⚠️  Please set MySQL root password manually if needed${NC}"
else
    echo -e "${GREEN}✅ MySQL already installed${NC}"
fi
echo ""

# Step 6: Install Nginx
echo -e "${YELLOW}Step 6: Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✅ Nginx installed!${NC}"
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi
echo ""

# Step 7: Install PM2
echo -e "${YELLOW}Step 7: Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
    echo -e "${GREEN}✅ PM2 installed!${NC}"
else
    echo -e "${GREEN}✅ PM2 already installed${NC}"
fi
echo ""

# Step 8: Install Redis (Optional)
echo -e "${YELLOW}Step 8: Installing Redis...${NC}"
if ! command -v redis-cli &> /dev/null; then
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
    echo -e "${GREEN}✅ Redis installed!${NC}"
else
    echo -e "${GREEN}✅ Redis already installed${NC}"
fi
echo ""

# Step 9: Clone Repository
echo -e "${YELLOW}Step 9: Cloning repository...${NC}"

if [ -d "$PROJECT_DIR" ]; then
    echo "📦 Project directory exists, updating..."
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

echo -e "${GREEN}✅ Repository ready!${NC}"
echo ""

# Step 10: Setup Backend
echo -e "${YELLOW}Step 10: Setting up Backend (Laravel)...${NC}"
cd "$PROJECT_DIR/app/backend"

# Install dependencies
echo "📦 Installing Composer dependencies..."
composer install --optimize-autoloader --no-dev --no-interaction

# Setup .env
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    php artisan key:generate
fi

# Set permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

echo -e "${GREEN}✅ Backend setup complete!${NC}"
echo ""

# Step 11: Setup Frontend
echo -e "${YELLOW}Step 11: Setting up Frontend (React)...${NC}"
cd "$PROJECT_DIR/app/frontend"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install --production

# Create .env.production with IP
echo "📝 Creating .env.production with IP address..."
cat > .env.production << EOF
REACT_APP_BACKEND_URL=http://$VPS_IP:8000
REACT_APP_API_BASE_URL=http://$VPS_IP:8000/api
REACT_APP_API_URL=http://$VPS_IP:8000/api
NODE_ENV=production
EOF

# Build production
echo "🏗️  Building production bundle..."
npm run build

echo -e "${GREEN}✅ Frontend setup complete!${NC}"
echo ""

# Step 12: Setup Landing Page (Optional)
if [ -d "$PROJECT_DIR/app/beranda" ]; then
    echo -e "${YELLOW}Step 12: Setting up Landing Page (Next.js)...${NC}"
    cd "$PROJECT_DIR/app/beranda"
    
    # Install dependencies
    npm install --production
    
    # Build production
    npm run build
    
    echo -e "${GREEN}✅ Landing page setup complete!${NC}"
    echo ""
fi

# Step 13: Configure Nginx for IP Access
echo -e "${YELLOW}Step 13: Configuring Nginx for IP access...${NC}"

# Backup default config
if [ -f /etc/nginx/sites-available/default ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
fi

# Create Nginx config for IP access
cat > /etc/nginx/sites-available/kasir-pos << EOF
# Backend API - Port 8000
server {
    listen 8000;
    server_name $VPS_IP;
    
    root $PROJECT_DIR/app/backend/public;
    index index.php;
    
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.(?!well-known).* {
        deny all;
    }
}

# Frontend App - Port 3000
server {
    listen 3000;
    server_name $VPS_IP;
    
    root $PROJECT_DIR/app/frontend/build;
    index index.html;
    
    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Static assets caching
    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Landing Page - Port 3001 (Optional)
server {
    listen 3001;
    server_name $VPS_IP;
    
    root $PROJECT_DIR/app/beranda/.next;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/kasir-pos /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured!${NC}"
echo ""

# Step 14: Setup PM2 for Backend
echo -e "${YELLOW}Step 14: Setting up PM2 for Backend...${NC}"
cd "$PROJECT_DIR/app/backend"

# Stop existing PM2 process if any
pm2 delete quickkasir-api 2>/dev/null || true

# Start backend with PM2
pm2 start "php artisan serve --host=0.0.0.0 --port=8000" --name "quickkasir-api"
pm2 save

echo -e "${GREEN}✅ Backend running on PM2!${NC}"
echo ""

# Step 15: Setup PM2 for Landing Page (if exists)
if [ -d "$PROJECT_DIR/app/beranda" ]; then
    echo -e "${YELLOW}Step 15: Setting up PM2 for Landing Page...${NC}"
    cd "$PROJECT_DIR/app/beranda"
    
    # Stop existing PM2 process if any
    pm2 delete quickkasir-landing 2>/dev/null || true
    
    # Start landing page with PM2
    pm2 start npm --name "quickkasir-landing" -- start
    pm2 save
    
    echo -e "${GREEN}✅ Landing page running on PM2!${NC}"
    echo ""
fi

# Step 16: Setup Redis for Laravel
echo -e "${YELLOW}Step 16: Setting up Redis for Laravel...${NC}"
cd "$PROJECT_DIR"

if [ -f "scripts/setup-redis-vps.sh" ]; then
    bash scripts/setup-redis-vps.sh
else
    # Manual Redis setup
    ENV_FILE="$PROJECT_DIR/app/backend/.env"
    if [ -f "$ENV_FILE" ]; then
        # Add Redis config if not exists
        if ! grep -q "^REDIS_CLIENT=" "$ENV_FILE"; then
            echo "" >> "$ENV_FILE"
            echo "# Redis Configuration" >> "$ENV_FILE"
            echo "REDIS_CLIENT=predis" >> "$ENV_FILE"
            echo "REDIS_HOST=127.0.0.1" >> "$ENV_FILE"
            echo "REDIS_PORT=6379" >> "$ENV_FILE"
            echo "CACHE_STORE=redis" >> "$ENV_FILE"
            echo "SESSION_DRIVER=redis" >> "$ENV_FILE"
            echo "QUEUE_CONNECTION=redis" >> "$ENV_FILE"
        fi
    fi
fi

echo -e "${GREEN}✅ Redis configured!${NC}"
echo ""

# Step 17: Cache Laravel Configuration
echo -e "${YELLOW}Step 17: Caching Laravel configuration...${NC}"
cd "$PROJECT_DIR/app/backend"

php artisan config:cache || echo "⚠️  Config cache failed"
php artisan route:cache || echo "⚠️  Route cache failed"
php artisan view:cache || echo "⚠️  View cache failed"

echo -e "${GREEN}✅ Configuration cached!${NC}"
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Access URLs:${NC}"
echo "   Backend API:  http://$VPS_IP:8000/api"
echo "   Frontend App: http://$VPS_IP:3000"
if [ -d "$PROJECT_DIR/app/beranda" ]; then
    echo "   Landing Page: http://$VPS_IP:3001"
fi
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Configure .env file:"
echo "   nano $PROJECT_DIR/app/backend/.env"
echo ""
echo "2. Update database configuration in .env:"
echo "   DB_CONNECTION=mysql"
echo "   DB_HOST=127.0.0.1"
echo "   DB_DATABASE=kasir_pos"
echo "   DB_USERNAME=kasir_user"
echo "   DB_PASSWORD=your_password"
echo ""
echo "3. Create database:"
echo "   sudo mysql -u root -p"
echo "   CREATE DATABASE kasir_pos;"
echo "   CREATE USER 'kasir_user'@'localhost' IDENTIFIED BY 'password';"
echo "   GRANT ALL PRIVILEGES ON kasir_pos.* TO 'kasir_user'@'localhost';"
echo ""
echo "4. Run migrations:"
echo "   cd $PROJECT_DIR/app/backend"
echo "   php artisan migrate --force"
echo ""
echo "5. Check PM2 status:"
echo "   pm2 list"
echo "   pm2 logs"
echo ""
echo "6. Check Nginx status:"
echo "   sudo systemctl status nginx"
echo ""
echo -e "${GREEN}🎉 Deployment selesai!${NC}"
echo ""
