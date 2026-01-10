# 🔍 Debug: Server Down Setelah 10 Detik

## Issue yang Ditemukan

**Gejala:**
- Server bisa start: `INFO Server running on http://127.0.0.1:8000`
- Tapi tidak merespons request (connection refused)
- CPU usage PHP tinggi (121%)
- Server hang/freeze setelah 10 detik

---

## 🔍 Kemungkinan Penyebab

1. **Infinite loop di middleware** - Middleware boot yang looping
2. **Service provider yang berat** - Provider boot menghabiskan resource
3. **Blocking request** - Request handler blocking/waiting
4. **Database lock** - Concurrent query atau transaction lock
5. **Built-in PHP server issue** - Port conflict atau resource limit

---

## ✅ Solusi yang Dicoba

1. ✅ Clear cache
2. ✅ Clear log file (karena terlalu besar)
3. ✅ Kill old PHP processes
4. ✅ Verify artisan commands work

---

## 🛠️ Solusi Lanjutan

### Option 1: Debug Middleware

File: `app/backend/app/Http/Kernel.php`

```php
protected $middleware = [
    // ...
];
```

**Cek apakah ada middleware yang looping**

---

### Option 2: Debug Service Providers

File: `app/backend/config/app.php`

```php
'providers' => [
    // ...
];
```

**Cek apakah ada provider yang berat di boot**

---

### Option 3: Gunakan Artisan Serve dengan Debug

```bash
cd app/backend

# Method 1: Run dengan strace/debug
php artisan serve --host=127.0.0.1 --port=8000 --verbose

# Method 2: Check dengan slow log
php -d display_errors=1 artisan serve
```

---

### Option 4: Gunakan Production Server (Better)

**Gunakan Nginx atau Apache daripada built-in PHP serve:**

```bash
# Kalau ada, gunakan:
php artisan serve --host=0.0.0.0 --port=8000 -- --workers=4
```

---

## 🔬 Debugging Steps Selanjutnya

1. **Check which request causing hang:**
   - Lihat Network tab di F12
   - Send request ke `/` (home)
   - Check apakah `/` route ada

2. **Check routes:**
   ```bash
   php artisan route:list | head -20
   ```

3. **Test specific route:**
   ```bash
   php artisan tinker
   >>> Route::dispatch(Request::create('/'))
   ```

4. **Enable query log:**
   - Update .env: `DB_QUERY_LOG=true`
   - Check queries yang dijalankan

---

## 📝 Workaround: Use Different Approach

### Use Docker (Best Practice)

```dockerfile
FROM php:8.3-fpm
RUN docker-php-ext-install pdo pdo_mysql
WORKDIR /app
COPY . .
CMD ["php", "artisan", "serve", "--host=0.0.0.0"]
```

---

### Use Supervisor

```bash
# Install supervisor
apt-get install supervisor

# Config /etc/supervisor/conf.d/laravel.conf
[program:laravel-server]
process_name=%(program_name)s_%(process_num)02d
command=php /app/backend/artisan serve --host=127.0.0.1 --port=8000
autostart=true
autorestart=true
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/laravel.log
```

---

## 🚨 Immediate Fix: Try Different Port

```bash
php artisan serve --host=127.0.0.1 --port=8001
```

---

## 📋 Checklist untuk Debug

- [ ] Check `/routes/web.php` - ada looping route?
- [ ] Check `app/Http/Kernel.php` - ada looping middleware?
- [ ] Check `config/app.php` - ada looping provider?
- [ ] Enable debug logging
- [ ] Test dengan simple route
- [ ] Check database queries
- [ ] Monitor with tools (monitoring.php)

---

## 🔗 Next Action

Baik kita perlu:
1. Check routes yang terdaftar
2. Test dengan minimal route
3. Debug middleware/provider
4. Atau gunakan alternative server

Mari kita debug lebih dalam!

