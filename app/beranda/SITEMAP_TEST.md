# 🗺️ Cara Test Sitemap.xml

## ✅ Status: Sitemap sudah dikonfigurasi dengan benar

File `app/sitemap.js` sudah ada dan berfungsi untuk generate sitemap.xml secara otomatis.

---

## 📍 Lokasi File Konfigurasi

```
app/beranda/app/sitemap.js
```

---

## 🔍 Cara Test Sitemap

### 1. **Development Mode**

1. Jalankan dev server:
   ```bash
   cd app/beranda
   npm run dev
   # atau
   yarn dev
   ```

2. Buka browser dan akses:
   ```
   http://localhost:3001/sitemap.xml
   ```

3. Anda akan melihat XML output seperti:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://quickkasir.com</loc>
       <lastmod>2025-01-01T00:00:00.000Z</lastmod>
       <changefreq>weekly</changefreq>
       <priority>1.0</priority>
     </url>
     ...
   </urlset>
   ```

### 2. **Production Build**

1. Build aplikasi:
   ```bash
   cd app/beranda
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Akses:
   ```
   http://localhost:3001/sitemap.xml
   ```

### 3. **Test dengan cURL (Terminal)**

```bash
# Development
curl http://localhost:3001/sitemap.xml

# Production (setelah deploy)
curl https://quickkasir.com/sitemap.xml
```

---

## 📋 URL yang ada di Sitemap

Berdasarkan `app/sitemap.js`, sitemap berisi 6 URL:

| URL | Priority | Change Frequency | Keterangan |
|-----|----------|------------------|------------|
| `/` | 1.0 | weekly | Homepage |
| `/#features` | 0.8 | monthly | Features section |
| `/#pricing` | 0.9 | weekly | Pricing section |
| `/#demo` | 0.7 | monthly | Demo section |
| `/#testimonials` | 0.6 | monthly | Testimonials section |
| `/#faq` | 0.6 | monthly | FAQ section |

---

## ⚙️ Konfigurasi Environment Variable

Sitemap menggunakan `NEXT_PUBLIC_SITE_URL` untuk base URL:

```env
NEXT_PUBLIC_SITE_URL=https://quickkasir.com
```

**Default:** `https://quickkasir.com` (jika env variable tidak ada)

---

## 🔗 Integrasi dengan Robots.txt

File `app/robots.js` sudah mengarah ke sitemap:

```javascript
sitemap: `${baseUrl}/sitemap.xml`
```

Robots.txt dapat diakses di:
- Development: `http://localhost:3001/robots.txt`
- Production: `https://quickkasir.com/robots.txt`

---

## ✅ Checklist Test Sitemap

- [ ] Sitemap dapat diakses: `/sitemap.xml`
- [ ] Format XML valid
- [ ] Semua URL memiliki `lastModified`, `changeFrequency`, dan `priority`
- [ ] Base URL benar (sesuai environment)
- [ ] Robots.txt mengarah ke sitemap
- [ ] Sitemap dapat diakses oleh search engine crawlers

---

## 🚀 Langkah Selanjutnya (Setelah Deploy)

1. **Submit ke Google Search Console:**
   - Login ke [Google Search Console](https://search.google.com/search-console)
   - Pilih property
   - Masuk ke "Sitemaps"
   - Submit: `https://quickkasir.com/sitemap.xml`

2. **Submit ke Bing Webmaster:**
   - Login ke [Bing Webmaster Tools](https://www.bing.com/webmasters)
   - Submit sitemap: `https://quickkasir.com/sitemap.xml`

3. **Test dengan Google Rich Results Test:**
   - https://search.google.com/test/rich-results
   - Test URL: `https://quickkasir.com`

---

## 📝 Catatan Penting

1. **Dynamic Generation:**
   - Sitemap di-generate secara dinamis saat runtime
   - Tidak ada file XML fisik di folder `public/`
   - Next.js otomatis generate route `/sitemap.xml` dari `app/sitemap.js`

2. **Auto-update:**
   - `lastModified` otomatis update setiap kali sitemap di-request
   - Menggunakan `new Date().toISOString()`

3. **Hash URLs:**
   - Sitemap menggunakan hash URLs (`#features`, `#pricing`, dll)
   - Ini adalah anchor links untuk single-page application
   - Search engines akan tetap index halaman utama

---

## 🔧 Troubleshooting

**Problem: Sitemap tidak bisa diakses**
- Pastikan dev server sudah running
- Check URL: harus `/sitemap.xml` (bukan `/sitemap`)
- Check console untuk error

**Problem: Base URL salah**
- Set environment variable: `NEXT_PUBLIC_SITE_URL`
- Atau update default di `app/sitemap.js`

**Problem: Format XML tidak valid**
- Pastikan function `sitemap()` return array of objects
- Pastikan setiap object memiliki `url`, `lastModified`, `changeFrequency`, `priority`
