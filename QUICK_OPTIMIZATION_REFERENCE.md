# ⚡ Quick Optimization Reference Card

## 🚀 INSTANT ACTIONS (Do These Now!)

### Frontend (5 minutes)
```bash
cd app/frontend

# 1. Install React Query (✅ Already done)
npm install @tanstack/react-query @tanstack/react-query-devtools

# 2. Test bundle analyzer
npm run build:analyze

# 3. Build for production
npm run build
```

### Backend (5 minutes)
```bash
cd app/backend

# 1. Run database indexes migration (✅ Critical!)
php artisan migrate

# 2. Optimize Laravel for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
composer dump-autoload --optimize
```

---

## 📊 Quick Performance Check

### Test Bundle Size
```bash
cd app/frontend
npm run build
# Check build/static/js/*.js file sizes
# Target: Main bundle < 200KB gzipped
```

### Test API Response Time
```bash
# Use browser DevTools Network tab
# Or use curl:
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/dashboard/stats

# Create curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
```

---

## 🔧 Essential Commands

### Frontend Development
```bash
# Start dev server
npm start

# Build for production
npm run build

# Analyze bundle
npm run build:analyze

# Run tests
npm test

# Clean build
rm -rf build node_modules/.cache
```

### Backend Development
```bash
# Clear caches (dev)
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize (production)
php artisan optimize

# Run migrations
php artisan migrate

# Run queue worker
php artisan queue:work

# Database seed
php artisan db:seed
```

---

## 🎯 Files You Created/Modified

### ✅ New Files
1. `app/frontend/src/config/reactQuery.js` - React Query configuration
2. `app/frontend/src/components/dashboards/DashboardOptimized.jsx` - Optimized dashboard
3. `app/backend/database/migrations/*_add_performance_indexes_to_all_tables.php` - Database indexes
4. `app/backend/optimize-production.bat` - Backend optimization script
5. `app/frontend/optimize-build.bat` - Frontend build script
6. `OPTIMIZATION_GUIDE.md` - Complete guide

### ✅ Modified Files
1. `app/frontend/src/App.js` - Added QueryClientProvider
2. `app/frontend/craco.config.js` - Enhanced webpack configuration
3. `app/frontend/package.json` - Added React Query dependencies

---

## 💡 Quick Wins Checklist

### Week 1 - Critical (Do First!)
- [x] ✅ Install React Query
- [x] ✅ Create database indexes migration
- [ ] ⏳ Run database migration: `php artisan migrate`
- [ ] ⏳ Replace original Dashboard with DashboardOptimized
- [ ] ⏳ Test bundle size: `npm run build:analyze`
- [ ] ⏳ Run backend optimization script
- [ ] ⏳ Test API response times

### Week 2 - Important
- [ ] Setup Redis caching
- [ ] Fix N+1 queries (use Laravel Debugbar to find them)
- [ ] Implement React Query in other components
- [ ] Add virtual scrolling for long lists
- [ ] Optimize images (if any)

### Week 3 - Nice to Have
- [ ] Setup Service Worker (PWA)
- [ ] Implement queue jobs
- [ ] Add monitoring (Sentry/Telescope)
- [ ] Setup CDN (Cloudflare)
- [ ] Performance testing with Lighthouse

---

## 🆘 Troubleshooting Quick Fixes

### "npm run build fails"
```bash
# Clean and rebuild
rm -rf node_modules build
npm install
npm run build
```

### "Migration fails"
```bash
# Check if indexes already exist
php artisan migrate:status

# Rollback last migration
php artisan migrate:rollback --step=1

# Try again
php artisan migrate
```

### "Cache issues after optimization"
```bash
# Clear everything
php artisan optimize:clear
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Re-optimize
php artisan optimize
```

### "Bundle too large"
```bash
# Analyze what's taking space
npm run build:analyze

# Check for duplicate deps
npm dedupe

# Remove unused deps
npx depcheck
```

---

## 📈 Performance Targets

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Initial Load | ? | < 2s | DevTools Network tab |
| Bundle Size | ? | < 500KB | `npm run build` |
| API Response | ? | < 200ms | DevTools Network tab |
| Database Query | ? | < 50ms | Laravel Telescope |
| Lighthouse Score | ? | > 90 | `npx lighthouse <url>` |

---

## 🔗 Quick Links

- **Optimization Guide:** [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)
- **React Query Docs:** https://tanstack.com/query/latest/docs/react/overview
- **Laravel Performance:** https://laravel.com/docs/deployment#optimization
- **Web Vitals:** https://web.dev/vitals/

---

## 📞 Need Help?

1. Check `OPTIMIZATION_GUIDE.md` for detailed instructions
2. Check browser console for errors
3. Check `app/backend/storage/logs/laravel.log`
4. Run `php artisan optimize:clear` and try again
5. Check that all environment variables are set correctly

---

**Quick Stats:**
- ✅ 8 Optimizations Implemented
- ✅ 6 Files Created
- ✅ 3 Files Modified
- ⏳ Ready for Production Testing

**Next Step:** Run `php artisan migrate` to apply database indexes!
