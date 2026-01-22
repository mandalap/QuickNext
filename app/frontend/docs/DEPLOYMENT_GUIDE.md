# 🚀 Deployment Guide - QuickKasir POS System

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Server with Node.js support (or static hosting)
- HTTPS certificate (required for PWA)
- Domain name (optional but recommended)

---

## 📦 Build Process

### 1. Environment Setup

Create `.env.production` file:

```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_APP_NAME=QuickKasir
NODE_ENV=production
```

### 2. Install Dependencies

```bash
cd app/frontend
npm install
```

### 3. Build Production

```bash
npm run build
```

**Output:** `build/` folder dengan semua static files

---

## 🌐 Deployment Options

### Option 1: Static Hosting (Recommended)

**Providers:**
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

**Steps (Vercel):**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Deploy: `vercel --prod`

**Steps (Netlify):**
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Build: `npm run build`
3. Deploy: `netlify deploy --prod --dir=build`

### Option 2: Node.js Server

**Using Express:**
```javascript
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port);
```

**Using serve:**
```bash
npm install -g serve
serve -s build -l 3000
```

### Option 3: Nginx

**Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /path/to/build;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔒 HTTPS Setup (Required for PWA)

### Option 1: Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Option 2: Cloudflare (Free)

1. Add domain to Cloudflare
2. Update nameservers
3. Enable SSL/TLS (Full mode)
4. Cloudflare akan handle HTTPS

### Option 3: Commercial Certificate

- Buy SSL certificate
- Install di server
- Configure di web server

---

## ⚙️ Environment Configuration

### Frontend Environment Variables

Create `.env.production`:

```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_APP_NAME=QuickKasir
REACT_APP_ENV=production
```

### Backend Environment Variables

Create `.env` in backend:

```env
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kasir_pos
DB_USERNAME=root
DB_PASSWORD=
```

---

## 🔄 Update Process

### 1. Build New Version

```bash
cd app/frontend
npm run build
```

### 2. Deploy

**Static Hosting:**
- Push to Git
- Auto-deploy via CI/CD
- Or manual upload `build/` folder

**Server:**
```bash
# Backup old build
cp -r build build.backup

# Deploy new build
cp -r build /path/to/server/www

# Restart server (if needed)
sudo systemctl restart nginx
```

### 3. Service Worker Update

Service worker akan auto-update:
1. User buka app
2. New service worker terdeteksi
3. Update notification muncul
4. User klik "Update Sekarang"
5. App reload dengan versi baru

---

## 📊 Monitoring

### 1. Error Tracking

**Sentry (Recommended):**
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});
```

### 2. Analytics

**Google Analytics:**
```javascript
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
```

### 3. Performance Monitoring

- Lighthouse CI
- Web Vitals
- Real User Monitoring (RUM)

---

## 🔐 Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secure
- [ ] API keys not exposed
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] XSS protection
- [ ] CSRF protection

---

## 📝 Post-Deployment

### 1. Verify Deployment

- [ ] App loads correctly
- [ ] API calls working
- [ ] PWA installable
- [ ] Service worker registered
- [ ] Offline mode working
- [ ] All features functional

### 2. Test PWA Features

- [ ] Install prompt works
- [ ] App installs correctly
- [ ] Offline mode works
- [ ] Sync works
- [ ] Update notification works

### 3. Performance Check

- [ ] Lighthouse score > 80
- [ ] Load time < 3s
- [ ] Bundle size optimal
- [ ] No console errors

---

## 🆘 Troubleshooting

### Build Fails
- Check Node.js version
- Clear node_modules and reinstall
- Check for errors in console

### PWA Not Working
- Verify HTTPS is enabled
- Check manifest.json
- Verify service worker registered
- Check browser console for errors

### API Errors
- Verify API_URL is correct
- Check CORS configuration
- Verify backend is running
- Check network tab in DevTools

---

## 📚 Resources

- [Vercel Deployment](https://vercel.com/docs)
- [Netlify Deployment](https://docs.netlify.com/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Happy Deploying!** 🚀

