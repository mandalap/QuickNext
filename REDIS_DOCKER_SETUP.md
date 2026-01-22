# 🚀 Panduan Setup Redis dengan Docker di Windows

Panduan lengkap untuk menghubungkan Redis ke aplikasi QuickKasir menggunakan Docker di Windows.

---

## 📋 Prerequisites

- ✅ Docker Desktop sudah terinstall dan running
- ✅ PHP dan Composer sudah terinstall
- ✅ Laravel backend sudah setup

---

## 🎯 Step-by-Step Setup

### **Step 1: Verifikasi Docker**

Pastikan Docker Desktop sudah running. Buka PowerShell dan jalankan:

```powershell
docker --version
```

Jika muncul versi Docker, berarti sudah siap!

---

### **Step 2: Jalankan Script Setup Otomatis** ⭐ (RECOMMENDED)

Jalankan script setup otomatis yang akan melakukan semua konfigurasi:

```powershell
cd e:\development\kasir-pos-system
.\scripts\setup-redis-docker-windows.ps1
```

Script ini akan:
- ✅ Check Docker installation
- ✅ Create & start Redis container
- ✅ Update `.env` file dengan konfigurasi Redis
- ✅ Clear Laravel config cache
- ✅ Test koneksi Laravel ke Redis

---

### **Step 3: Manual Setup (Jika Script Gagal)**

Jika script otomatis tidak berjalan, ikuti langkah manual berikut:

#### **3.1. Start Redis Container**

```powershell
docker run -d `
  --name quickkasir-redis `
  -p 6379:6379 `
  --restart unless-stopped `
  redis:7-alpine `
  redis-server --appendonly yes
```

**Penjelasan:**
- `-d`: Run container di background (detached mode)
- `--name quickkasir-redis`: Nama container
- `-p 6379:6379`: Map port 6379 (Redis default port)
- `--restart unless-stopped`: Auto-restart jika Docker restart
- `redis:7-alpine`: Image Redis versi 7 (lightweight)
- `--appendonly yes`: Enable persistence (data tidak hilang saat restart)

#### **3.2. Test Redis Container**

```powershell
docker exec quickkasir-redis redis-cli ping
```

Jika muncul `PONG`, berarti Redis berjalan dengan baik!

#### **3.3. Update .env File**

Edit file `app/backend/.env` dan tambahkan/update konfigurasi berikut:

```env
# Redis Configuration (Docker)
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null
REDIS_DB=0
REDIS_CACHE_DB=1

# Cache using Redis
CACHE_STORE=redis
CACHE_PREFIX=quickkasir-cache-

# Session using Redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

# Queue using Redis
QUEUE_CONNECTION=redis
```

#### **3.4. Clear Laravel Config Cache**

```powershell
cd app\backend
php artisan config:clear
php artisan cache:clear
```

#### **3.5. Test Koneksi dari Laravel**

```powershell
php artisan tinker
```

Kemudian di dalam tinker, jalankan:

```php
Cache::put('test', 'success', 60);
Cache::get('test');
```

Jika muncul `"success"`, berarti koneksi berhasil! ✅

---

## 🧪 Testing

### **Test 1: Redis Container**

```powershell
docker exec quickkasir-redis redis-cli ping
```

**Expected output:** `PONG`

### **Test 2: Laravel Configuration**

Jalankan script test:

```powershell
.\scripts\test-redis.ps1
```

Script ini akan test:
- ✅ Redis server connection
- ✅ Laravel .env configuration
- ✅ Laravel cache functionality

### **Test 3: Manual Laravel Test**

```powershell
cd app\backend
php artisan tinker
```

```php
// Test cache
Cache::put('quickkasir_test', 'Hello Redis!', 60);
Cache::get('quickkasir_test');

// Test session (jika sudah login)
session(['test' => 'Redis session works!']);
session('test');

// Test queue connection
use Illuminate\Support\Facades\Queue;
Queue::size('default');
```

---

## 🔧 Useful Commands

### **Docker Commands**

```powershell
# Start Redis
docker start quickkasir-redis

# Stop Redis
docker stop quickkasir-redis

# Restart Redis
docker restart quickkasir-redis

# View Redis logs
docker logs quickkasir-redis

# View Redis logs (follow)
docker logs -f quickkasir-redis

# Access Redis CLI
docker exec -it quickkasir-redis redis-cli

# Remove Redis container
docker rm -f quickkasir-redis

# Check Redis status
docker ps | findstr redis
```

### **Redis CLI Commands** (dalam container)

```powershell
# Access Redis CLI
docker exec -it quickkasir-redis redis-cli

# Di dalam Redis CLI:
PING                    # Test connection
KEYS *                  # List all keys
GET <key>               # Get value
SET <key> <value>       # Set value
DEL <key>               # Delete key
FLUSHALL                # Clear all data (HATI-HATI!)
INFO                    # Redis server info
MONITOR                 # Monitor all commands
```

### **Laravel Commands**

```powershell
cd app\backend

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Rebuild config cache
php artisan config:cache

# Test cache
php artisan tinker
# Then: Cache::put('test', 'value', 60); Cache::get('test');
```

---

## 🐛 Troubleshooting

### **Problem 1: Docker tidak running**

**Error:** `Cannot connect to the Docker daemon`

**Solution:**
1. Buka Docker Desktop
2. Tunggu sampai status "Docker Desktop is running"
3. Coba lagi

---

### **Problem 2: Port 6379 sudah digunakan**

**Error:** `Bind for 0.0.0.0:6379 failed: port is already allocated`

**Solution:**

**Option A:** Stop container yang menggunakan port tersebut
```powershell
docker ps
docker stop <container-id>
```

**Option B:** Gunakan port lain
```powershell
docker run -d --name quickkasir-redis -p 6380:6379 redis:7-alpine
```
Kemudian update `.env`: `REDIS_PORT=6380`

---

### **Problem 3: Container tidak start**

**Error:** Container created tapi tidak running

**Solution:**
```powershell
# Check logs
docker logs quickkasir-redis

# Remove dan recreate
docker rm -f quickkasir-redis
docker run -d --name quickkasir-redis -p 6379:6379 redis:7-alpine
```

---

### **Problem 4: Laravel tidak bisa connect ke Redis**

**Error:** `Connection refused` atau `No connection could be made`

**Solution:**

1. **Check Redis container running:**
   ```powershell
   docker ps | findstr redis
   ```

2. **Test Redis dari container:**
   ```powershell
   docker exec quickkasir-redis redis-cli ping
   ```

3. **Check .env configuration:**
   - Pastikan `REDIS_HOST=127.0.0.1`
   - Pastikan `REDIS_PORT=6379`
   - Pastikan `REDIS_CLIENT=predis`

4. **Clear Laravel cache:**
   ```powershell
   cd app\backend
   php artisan config:clear
   php artisan cache:clear
   ```

5. **Check firewall:**
   - Pastikan Windows Firewall tidak block port 6379

---

### **Problem 5: Cache tidak bekerja**

**Error:** Cache selalu miss atau tidak tersimpan

**Solution:**

1. **Check CACHE_STORE di .env:**
   ```env
   CACHE_STORE=redis
   ```

2. **Test cache manual:**
   ```powershell
   php artisan tinker
   ```
   ```php
   Cache::put('test', 'value', 60);
   Cache::get('test'); // Should return 'value'
   ```

3. **Check Redis keys:**
   ```powershell
   docker exec quickkasir-redis redis-cli
   KEYS *
   ```

---

## 📊 Monitoring Redis

### **View Redis Stats**

```powershell
docker exec quickkasir-redis redis-cli INFO
```

### **Monitor Commands in Real-time**

```powershell
docker exec -it quickkasir-redis redis-cli MONITOR
```

### **Check Memory Usage**

```powershell
docker exec quickkasir-redis redis-cli INFO memory
```

### **View All Keys**

```powershell
docker exec quickkasir-redis redis-cli KEYS "*"
```

---

## ✅ Verification Checklist

Setelah setup, pastikan semua ini ✅:

- [ ] Docker Desktop running
- [ ] Redis container running (`docker ps`)
- [ ] Redis responding (`docker exec quickkasir-redis redis-cli ping` = PONG)
- [ ] `.env` file updated dengan Redis config
- [ ] Laravel config cleared (`php artisan config:clear`)
- [ ] Laravel cache test berhasil (`Cache::get('test')` = success)
- [ ] Session menggunakan Redis (check setelah login)
- [ ] Queue connection ke Redis (optional)

---

## 🎉 Success!

Jika semua checklist ✅, berarti Redis sudah terhubung dengan Laravel!

**Next Steps:**
- Redis akan digunakan untuk:
  - ✅ Cache (faster response)
  - ✅ Session storage (scalable)
  - ✅ Queue processing (background jobs)

**Performance Tips:**
- Redis akan meningkatkan performa aplikasi secara signifikan
- Cache akan membuat response lebih cepat
- Session di Redis memungkinkan horizontal scaling

---

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/docs/)
- [Laravel Redis Configuration](https://laravel.com/docs/cache#redis)
- [Docker Redis Image](https://hub.docker.com/_/redis)

---

**Need Help?** Jalankan script test untuk diagnosis:
```powershell
.\scripts\test-redis.ps1
```
