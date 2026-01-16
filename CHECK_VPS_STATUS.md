# 🔍 QuickKasir VPS Status Check

Script untuk mengecek status keseluruhan sistem QuickKasir di VPS.

---

## 📋 Cara Menggunakan

### 1. Upload Script ke VPS

```bash
# Di local machine (Windows), copy script ke VPS
scp check-vps-status.sh mandala@210.79.191.219:/home/mandala/
```

### 2. Jalankan di VPS

```bash
# SSH ke VPS
ssh mandala@210.79.191.219

# Berikan permission execute
chmod +x check-vps-status.sh

# Jalankan script
./check-vps-status.sh
```

---

## ✅ Yang Dicek

Script ini akan mengecek:

1. **PM2 Processes** - Status semua aplikasi (frontend, landing, queue)
2. **Nginx Status** - Apakah web server running
3. **SSL Certificates** - Status dan expiry date semua certificate
4. **HTTP/HTTPS Connections** - Test koneksi ke semua subdomain
5. **Port Status** - Port 80, 443, 3001, 8000
6. **Disk Space** - Penggunaan disk
7. **Memory Usage** - Penggunaan RAM
8. **Recent PM2 Errors** - Error terakhir dari PM2
9. **Recent Nginx Errors** - Error terakhir dari Nginx
10. **Build Files** - Apakah build files ada
11. **Environment Variables** - Apakah .env files ada dan benar
12. **File Permissions** - Apakah storage dan cache writable

---

## 📊 Output Example

```
==========================================
🔍 QUICKKASIR VPS STATUS CHECK
==========================================

📦 1. PM2 PROCESSES STATUS
----------------------------------------
┌────┬────────────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id │ name                   │ status      │ cpu     │ mem     │ uptime   │
├────┼────────────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0  │ quickkasir-frontend    │ online      │ 0%      │ 50mb    │ 5m       │
│ 1  │ quickkasir-landing     │ online      │ 0%      │ 60mb    │ 2m       │
└────┴────────────────────────┴─────────────┴─────────┴─────────┴──────────┘

🌐 2. NGINX STATUS
----------------------------------------
✓ Nginx is running

🔒 3. SSL CERTIFICATES
----------------------------------------
Certificate Name: app.quickkasir.com
Domains: app.quickkasir.com
Expiry Date: 2026-04-15 15:18:44+00:00 (VALID: 89 days)

...
```

---

## 🚀 Quick Check Commands

Jika tidak ingin menggunakan script, bisa jalankan command manual:

### Cek PM2 Status
```bash
pm2 status
```

### Cek Nginx Status
```bash
sudo systemctl status nginx
```

### Cek SSL Certificates
```bash
sudo certbot certificates
```

### Test HTTP/HTTPS
```bash
curl -I http://app.quickkasir.com
curl -I https://app.quickkasir.com
```

### Cek Ports
```bash
sudo netstat -tlnp | grep -E ":(80|443|3001|8000)"
```

### Cek Recent Errors
```bash
pm2 logs --lines 10 --nostream --err
sudo tail -10 /var/log/nginx/error.log
```

---

## 🔧 Troubleshooting

### Jika Script Tidak Bisa Di-Jalankan

```bash
# Pastikan permission benar
chmod +x check-vps-status.sh

# Atau jalankan dengan bash
bash check-vps-status.sh
```

### Jika Ada Error "Permission Denied"

```bash
# Untuk beberapa command, mungkin perlu sudo
# Edit script dan tambahkan sudo di command yang perlu
```

---

**Jalankan script ini secara berkala untuk memastikan semua service berjalan dengan baik!**
