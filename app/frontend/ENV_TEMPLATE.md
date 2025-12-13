# Frontend Environment Variables Template

Copy this content to `.env.local` file:

```env
# ==========================================
# QuickKasir POS System - Frontend Environment Variables
# ==========================================
# Copy this content to .env.local and update values as needed
# DO NOT commit .env.local to version control!

# ==========================================
# API Configuration
# ==========================================
# Backend base URL (without /api)
REACT_APP_BACKEND_URL=http://localhost:8000

# Backend API base URL (with /api)
REACT_APP_API_BASE_URL=http://localhost:8000/api

# Alternative API URL (used by some components)
REACT_APP_API_URL=http://localhost:8000/api

# ==========================================
# Push Notifications (PWA)
# ==========================================
# VAPID public key for push notifications
# Generate with: php app/backend/generate-vapid-keys.php
REACT_APP_VAPID_PUBLIC_KEY=

# ==========================================
# Environment
# ==========================================
# Set to 'production' for production build
NODE_ENV=development

# ==========================================
# Notes
# ==========================================
# - All REACT_APP_* variables are exposed to browser
# - Never store sensitive data in REACT_APP_* variables
# - For production, update URLs to production domains
# - Make sure VAPID_PUBLIC_KEY matches backend VAPID_PUBLIC_KEY
```
