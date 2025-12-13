# 📸 PWA Screenshots Guide

## Screenshots yang Diperlukan

### Untuk Install Prompt (Chrome/Edge)

1. **Landscape (1280x720)**
   - Desktop view
   - Dashboard atau main screen
   - Format: PNG atau JPG

2. **Portrait - iPhone (750x1334)**
   - Mobile view
   - Dashboard atau POS screen
   - Format: PNG atau JPG

3. **Tablet (1280x800)**
   - Tablet view
   - Dashboard atau main screen
   - Format: PNG atau JPG

---

## Cara Mengambil Screenshots

### Option 1: Browser DevTools
1. Buka app di browser
2. Buka DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M)
4. Pilih device (iPhone, iPad, Desktop)
5. Resize viewport ke ukuran yang diinginkan
6. Screenshot menggunakan:
   - Chrome: DevTools > More tools > Capture screenshot
   - Firefox: DevTools > Settings > Take screenshot
   - Edge: DevTools > More tools > Capture screenshot

### Option 2: Browser Extension
- **Full Page Screen Capture** (Chrome)
- **Awesome Screenshot** (Chrome/Firefox)
- **Nimbus Screenshot** (Chrome/Firefox)

### Option 3: Manual Resize
1. Ambil screenshot dengan ukuran apapun
2. Resize menggunakan image editor ke ukuran yang diperlukan
3. Tools: Photoshop, GIMP, atau online editor

---

## Screenshot Guidelines

### Best Practices:
- ✅ Tampilkan fitur utama app (Dashboard, POS, dll)
- ✅ Pastikan UI terlihat jelas dan professional
- ✅ Hindari data sensitif (gunakan dummy data)
- ✅ Gunakan light mode (lebih baik untuk install prompt)
- ✅ Pastikan text readable
- ✅ Highlight key features

### Screenshots yang Disarankan:
1. **Dashboard** - Menampilkan overview bisnis
2. **POS Screen** - Menampilkan fitur utama (kasir)
3. **Mobile View** - Menampilkan responsive design

---

## Update manifest.json

Setelah screenshots di-generate, update `manifest.json`:

```json
{
  "screenshots": [
    {
      "src": "/screenshots/desktop-1280x720.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "QuickKasir Dashboard"
    },
    {
      "src": "/screenshots/mobile-750x1334.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "QuickKasir Mobile POS"
    },
    {
      "src": "/screenshots/tablet-1280x800.png",
      "sizes": "1280x800",
      "type": "image/png",
      "form_factor": "wide",
      "label": "QuickKasir Tablet View"
    }
  ]
}
```

---

## Struktur File

```
app/frontend/public/
└── screenshots/
    ├── desktop-1280x720.png
    ├── mobile-750x1334.png
    └── tablet-1280x800.png
```

---

## Testing

Setelah screenshots ditambahkan:

1. Build production: `npm run build`
2. Serve: `npx serve -s build`
3. Buka di Chrome DevTools > Application > Manifest
4. Cek apakah screenshots terdeteksi
5. Test install prompt - screenshots harus muncul

---

## Notes

- **Format**: PNG recommended (better quality)
- **Size**: Keep file size reasonable (< 500KB per screenshot)
- **Compression**: Use tools like TinyPNG untuk compress
- **Accessibility**: Add descriptive labels

