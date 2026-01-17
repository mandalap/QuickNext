# 🔄 Cara Git Pull di VPS

## 📋 Langkah-langkah Git Pull di VPS

### **STEP 1: SSH ke VPS**

```bash
ssh mandala@your-vps-ip
# atau
ssh mandala@quick-app
```

---

### **STEP 2: Masuk ke Directory Project**

```bash
cd /var/www/quickkasir
```

---

### **STEP 3: Cek Status Git**

```bash
# Cek status current branch dan perubahan
git status

# Cek apakah ada perubahan lokal yang belum di-commit
git diff
```

**⚠️ PENTING:** Jika ada perubahan lokal yang belum di-commit:

- **Opsi A:** Commit perubahan lokal dulu
- **Opsi B:** Stash perubahan lokal (simpan sementara)
- **Opsi C:** Discard perubahan lokal (hapus, hati-hati!)

---

### **STEP 4: Pull Perubahan dari GitHub**

#### **Opsi 1: Pull Normal (Recommended)**

```bash
git pull origin main
```

#### **Opsi 2: Pull dengan Rebase (jika ada conflict)**

```bash
git pull --rebase origin main
```

#### **Opsi 3: Force Pull (hati-hati, akan overwrite perubahan lokal)**

```bash
# Backup dulu jika perlu
git stash

# Force pull
git fetch origin
git reset --hard origin/main
```

---

### **STEP 5: Jika Ada Conflict**

Jika ada conflict, git akan memberitahu file yang conflict:

```bash
# Lihat file yang conflict
git status

# Edit file yang conflict, cari tanda:
# <<<<<<< HEAD
# (kode lokal)
# =======
# (kode dari GitHub)
# >>>>>>> origin/main

# Setelah selesai edit, stage file:
git add <file-yang-conflict>

# Lanjutkan merge/rebase:
git rebase --continue
# atau
git merge --continue
```

---

### **STEP 6: Clear Cache (Jika Perlu)**

Setelah pull, clear cache Laravel dan rebuild jika ada perubahan:

```bash
# Backend
cd /var/www/quickkasir/app/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Frontend (jika ada perubahan)
cd /var/www/quickkasir/app/frontend
npm install  # jika ada package baru
npm run build  # rebuild production

# Landing (jika ada perubahan)
cd /var/www/quickkasir/app/beranda
npm install  # jika ada package baru
npm run build  # rebuild production
```

---

### **STEP 7: Restart Services**

```bash
# Restart PM2 (jika menggunakan PM2)
pm2 restart all

# Atau restart service tertentu
pm2 restart quickkasir-landing
pm2 restart quickkasir-frontend
pm2 restart quickkasir-queue
```

---

## 🚀 Quick Script untuk Git Pull di VPS

Buat file `pull-updates.sh` di VPS:

```bash
#!/bin/bash

echo "🔄 Pulling latest changes from GitHub..."
cd /var/www/quickkasir

# Backup current state
echo "📦 Creating backup..."
git stash push -m "Backup before pull $(date +%Y%m%d_%H%M%S)"

# Pull latest changes
echo "⬇️  Pulling from GitHub..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Git pull successful!"

    # Clear Laravel cache
    echo "🧹 Clearing Laravel cache..."
    cd app/backend
    php artisan config:clear
    php artisan cache:clear
    php artisan route:clear
    php artisan view:clear

    # Rebuild frontend if needed (uncomment if needed)
    # echo "🔨 Rebuilding frontend..."
    # cd ../frontend
    # npm run build

    # Restart PM2
    echo "🔄 Restarting PM2 services..."
    pm2 restart all

    echo "✅ Update complete!"
else
    echo "❌ Git pull failed! Check for conflicts."
    echo "💾 Backup saved in git stash. Use 'git stash list' to see backups."
fi
```

**Cara menggunakan:**

```bash
# Buat file
nano /var/www/quickkasir/pull-updates.sh

# Copy script di atas, save (Ctrl+O, Enter, Ctrl+X)

# Beri permission
chmod +x /var/www/quickkasir/pull-updates.sh

# Jalankan
./pull-updates.sh
```

---

## 🔍 Troubleshooting

### **Q: Error "Your local changes would be overwritten"**

**A:** Ada perubahan lokal yang belum di-commit. Pilih salah satu:

```bash
# Opsi 1: Stash (simpan sementara)
git stash
git pull origin main
git stash pop  # restore perubahan setelah pull

# Opsi 2: Commit perubahan lokal dulu
git add .
git commit -m "Local changes before pull"
git pull origin main

# Opsi 3: Discard perubahan lokal (HATI-HATI!)
git checkout -- .
git pull origin main
```

---

### **Q: Error "Permission denied"**

**A:** Pastikan user memiliki permission:

```bash
# Cek ownership
ls -la /var/www/quickkasir

# Fix ownership jika perlu
sudo chown -R mandala:mandala /var/www/quickkasir

# Atau gunakan sudo (tidak recommended)
sudo git pull origin main
```

---

### **Q: Error "Not a git repository"**

**A:** Pastikan berada di directory yang benar:

```bash
# Cek apakah ini git repository
ls -la | grep .git

# Jika tidak ada .git, clone ulang atau init
cd /var/www/quickkasir
git init
git remote add origin https://github.com/mandalap/QuickNext.git
git pull origin main
```

---

### **Q: Conflict saat pull**

**A:** Resolve conflict manual:

```bash
# Lihat file yang conflict
git status

# Edit file yang conflict
nano <file-yang-conflict>

# Setelah selesai, stage file
git add <file-yang-conflict>

# Continue merge
git merge --continue
# atau
git rebase --continue
```

---

## ✅ Checklist Setelah Pull

- [ ] Git pull berhasil tanpa error
- [ ] Tidak ada conflict yang belum di-resolve
- [ ] Clear Laravel cache (config, cache, route, view)
- [ ] Rebuild frontend/landing jika ada perubahan (npm run build)
- [ ] Restart PM2 services
- [ ] Test website apakah berjalan normal
- [ ] Cek logs jika ada error

---

## 📝 Catatan Penting

1. **Selalu backup sebelum pull** jika ada perubahan penting
2. **Jangan pull di production** tanpa testing di staging dulu
3. **Cek perubahan** dengan `git log` sebelum pull
4. **Monitor logs** setelah pull untuk memastikan tidak ada error
5. **Test fitur** yang di-update setelah pull

---

## 🔄 Workflow Recommended

```bash
# 1. SSH ke VPS
ssh mandala@your-vps-ip

# 2. Masuk ke project directory
cd /var/www/quickkasir

# 3. Cek status
git status

# 4. Stash perubahan lokal (jika ada)
git stash

# 5. Pull
git pull origin main

# 6. Clear cache
cd app/backend
php artisan config:clear
php artisan cache:clear

# 7. Restart services
pm2 restart all

# 8. Cek logs
pm2 logs --lines 20
```

---

## 🚨 Emergency Rollback

Jika setelah pull ada masalah, rollback ke commit sebelumnya:

```bash
# Lihat commit history
git log --oneline -10

# Rollback ke commit tertentu
git reset --hard <commit-hash>

# Atau rollback 1 commit
git reset --hard HEAD~1

# Force push (HATI-HATI, hanya jika benar-benar perlu!)
# git push origin main --force
```

---

**Selamat update! 🎉**
