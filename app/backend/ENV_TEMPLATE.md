# Backend Environment Variables Template

Copy this content to `.env` file:

```env
# ==========================================
# QuickKasir POS System - Backend Environment Variables
# ==========================================
# Copy this content to .env and update values as needed
# DO NOT commit .env to version control!

# ==========================================
# Application Configuration
# ==========================================
APP_NAME="QuickKasir POS System"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

# ==========================================
# Frontend URLs (for CORS & Redirects)
# ==========================================
FRONTEND_URL=http://localhost:3000
LANDING_URL=http://localhost:3001

# ==========================================
# Database Configuration
# ==========================================
# SQLite (Default - for development)
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# MySQL/PostgreSQL (for production)
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=quickkasir
# DB_USERNAME=root
# DB_PASSWORD=

# ==========================================
# Push Notifications (PWA)
# ==========================================
# Generate with: php generate-vapid-keys.php
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@quickkasir.com

# ==========================================
# Midtrans Payment Gateway
# ==========================================
# Get from: https://dashboard.midtrans.com/settings/config_info
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true

# ==========================================
# Mail Configuration (Optional)
# ==========================================
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@quickkasir.com"
MAIL_FROM_NAME="${APP_NAME}"

# ==========================================
# Queue Configuration (Optional)
# ==========================================
DB_QUEUE_CONNECTION=database
DB_QUEUE_TABLE=jobs
DB_QUEUE=default
DB_QUEUE_RETRY_AFTER=90

# ==========================================
# Maintenance Mode (Optional)
# ==========================================
APP_MAINTENANCE_DRIVER=file
APP_MAINTENANCE_STORE=database

# ==========================================
# Notes
# ==========================================
# - Generate APP_KEY with: php artisan key:generate
# - Set APP_DEBUG=false in production
# - Use strong passwords for production database
# - Never commit .env file to version control
# - Keep VAPID_PRIVATE_KEY secret
# - Use different keys for development and production
```
