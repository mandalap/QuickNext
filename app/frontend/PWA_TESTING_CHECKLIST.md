# ✅ PWA Testing Checklist

## 1. Install Prompt Testing

### Chrome/Edge Desktop
- [ ] Install prompt muncul di address bar
- [ ] Custom install prompt muncul (bottom-left/right)
- [ ] Klik "Install" berhasil install app
- [ ] App muncul di desktop/start menu
- [ ] App bisa dibuka sebagai standalone
- [ ] App tidak muncul di browser tab

### Chrome Mobile (Android)
- [ ] Install prompt muncul di browser
- [ ] Custom install prompt muncul
- [ ] Klik "Install" berhasil install app
- [ ] App muncul di app drawer
- [ ] App bisa dibuka sebagai standalone
- [ ] Splash screen muncul dengan icon

### Safari iOS
- [ ] "Add to Home Screen" muncul di share menu
- [ ] App bisa ditambahkan ke home screen
- [ ] App muncul dengan icon yang benar
- [ ] App bisa dibuka sebagai standalone

---

## 2. Service Worker Testing

### Registration
- [ ] Service worker ter-register saat pertama kali load
- [ ] Service worker aktif di DevTools > Application > Service Workers
- [ ] Cache terisi dengan assets yang benar

### Update Flow
- [ ] Update notification muncul ketika ada update
- [ ] Klik "Update Sekarang" berhasil update
- [ ] Page auto-reload setelah update
- [ ] Data tidak hilang setelah update

### Offline Mode
- [ ] App bisa diakses saat offline (Network > Offline)
- [ ] Static assets (JS, CSS) masih bisa di-load
- [ ] API responses di-cache dengan benar
- [ ] Navigation masih bekerja (SPA routing)

---

## 3. Offline Indicator Testing

### Online Status
- [ ] Badge tidak muncul saat online
- [ ] Banner tidak muncul saat online

### Offline Status
- [ ] Badge muncul di bottom-right saat offline
- [ ] Banner muncul di top-center saat offline
- [ ] Message jelas: "Mode Offline"

### Reconnection
- [ ] Banner "Koneksi dipulihkan" muncul saat online kembali
- [ ] Banner auto-hide setelah 3 detik
- [ ] Badge hilang saat online kembali

---

## 4. Offline Transaction Sync Testing

### Save Offline
- [ ] Transaksi bisa dibuat saat offline
- [ ] Transaksi tersimpan ke IndexedDB
- [ ] Toast notification muncul: "Transaksi disimpan offline"
- [ ] SyncIndicator menampilkan jumlah pending

### Sync Online
- [ ] Auto-sync ketika online kembali
- [ ] Manual sync button bekerja
- [ ] Transaksi berhasil di-sync ke server
- [ ] SyncIndicator update setelah sync
- [ ] Toast notification muncul: "X transaksi berhasil disinkronkan"

### Error Handling
- [ ] Sync gagal ditangani dengan benar
- [ ] Failed transactions bisa di-retry
- [ ] Error message jelas

---

## 5. Performance Testing

### Load Time
- [ ] Initial load < 3 detik (3G)
- [ ] Initial load < 1 detik (4G/WiFi)
- [ ] Time to Interactive < 5 detik

### Bundle Size
- [ ] Main bundle < 200KB gzipped
- [ ] Total initial load < 500KB gzipped
- [ ] Code splitting bekerja (30+ chunks)

### Memory Usage
- [ ] Memory usage < 150MB
- [ ] No memory leaks (check dengan DevTools)

---

## 6. Cross-Browser Testing

### Chrome
- [ ] Install prompt ✅
- [ ] Service worker ✅
- [ ] Offline mode ✅
- [ ] Sync ✅

### Edge
- [ ] Install prompt ✅
- [ ] Service worker ✅
- [ ] Offline mode ✅
- [ ] Sync ✅

### Firefox
- [ ] Service worker ✅
- [ ] Offline mode ✅
- [ ] Sync ✅
- [ ] Install prompt (limited support)

### Safari (iOS)
- [ ] Add to Home Screen ✅
- [ ] Service worker ✅
- [ ] Offline mode ✅
- [ ] Sync ✅

---

## 7. Device Testing

### Desktop
- [ ] Windows (Chrome, Edge)
- [ ] macOS (Chrome, Safari)
- [ ] Linux (Chrome, Firefox)

### Mobile
- [ ] Android (Chrome)
- [ ] iOS (Safari)

### Tablet
- [ ] Android Tablet
- [ ] iPad

---

## 8. Error Scenarios

### Network Errors
- [ ] Timeout ditangani dengan benar
- [ ] Connection error ditangani
- [ ] Retry mechanism bekerja

### API Errors
- [ ] 400/401/403/404/500 errors ditangani
- [ ] Error messages user-friendly
- [ ] Error tidak crash app

### Service Worker Errors
- [ ] SW registration failure ditangani
- [ ] SW update failure ditangani
- [ ] Cache errors ditangani

---

## 9. User Experience

### Install Experience
- [ ] Install prompt tidak mengganggu
- [ ] Install process smooth
- [ ] App launch cepat setelah install

### Offline Experience
- [ ] User tahu mereka offline
- [ ] Transaksi bisa dibuat offline
- [ ] Data sync otomatis saat online

### Update Experience
- [ ] Update notification tidak mengganggu
- [ ] User bisa pilih kapan update
- [ ] Update process smooth

---

## 10. Security & Privacy

### HTTPS
- [ ] App hanya bekerja dengan HTTPS (production)
- [ ] Service worker hanya register dengan HTTPS

### Data Storage
- [ ] Data di IndexedDB aman
- [ ] No sensitive data di cache
- [ ] Cache bisa di-clear

---

## Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

Install Prompt: ✅ / ❌
Service Worker: ✅ / ❌
Offline Mode: ✅ / ❌
Sync: ✅ / ❌
Performance: ✅ / ❌
Errors: ___________

Notes:
___________
```

---

## Automated Testing (Optional)

### Lighthouse PWA Audit
```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

**Target Scores:**
- PWA: 90+
- Performance: 80+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 80+

---

## Quick Test Script

```bash
# Test PWA features
npm run build
npx serve -s build --listen 3000

# Open in browser
# 1. Test install prompt
# 2. Test offline mode (DevTools > Network > Offline)
# 3. Test sync (create transaction offline, go online)
# 4. Test update (modify service-worker.js, rebuild)
```

