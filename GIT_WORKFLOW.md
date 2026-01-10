# 📝 Git Workflow - Cara Update Repository

Panduan singkat untuk update repository setelah ada perubahan kode.

## 🔄 Workflow Update Repository

### 1. **Cek Status Perubahan**

```bash
git status
```

Ini akan menampilkan file-file yang berubah (modified), ditambahkan (untracked), atau dihapus.

### 2. **Tambah File yang Berubah ke Staging**

**Opsi A: Tambah semua perubahan**
```bash
git add .
```

**Opsi B: Tambah file spesifik**
```bash
git add nama-file.js
git add app/frontend/src/components/MyComponent.jsx
```

**Opsi C: Tambah beberapa file sekaligus**
```bash
git add file1.js file2.js file3.js
```

### 3. **Commit Perubahan**

```bash
git commit -m "Deskripsi perubahan yang dilakukan"
```

**Contoh pesan commit yang baik:**
```bash
git commit -m "Fix payroll calculation untuk working days"
git commit -m "Tambahkan fitur export laporan ke Excel"
git commit -m "Update UI landing page - ubah harga ke format harian"
git commit -m "Fix bug: tombol delete tidak muncul di payroll list"
```

**Best Practice:**
- Gunakan pesan commit yang jelas dan deskriptif
- Satu commit = satu perubahan/perbaikan
- Gunakan present tense (Fix, Add, Update, bukan Fixed, Added, Updated)

### 4. **Push ke GitHub**

```bash
git push
```

Atau jika ini push pertama untuk branch baru:
```bash
git push -u origin main
```

---

## 📋 Contoh Workflow Lengkap

```bash
# 1. Cek perubahan
git status

# 2. Tambah semua perubahan
git add .

# 3. Commit dengan pesan jelas
git commit -m "Fix: Update payroll filter dari tahun/bulan ke date picker"

# 4. Push ke GitHub
git push
```

---

## 🔍 Command Git yang Berguna

### Cek Perubahan Detail

```bash
# Lihat perubahan di file spesifik
git diff nama-file.js

# Lihat perubahan yang sudah di-staging
git diff --staged

# Lihat history commit
git log

# Lihat history commit (singkat)
git log --oneline
```

### Undo Perubahan (Jika Salah)

```bash
# Batalkan perubahan di file (belum di-add)
git checkout -- nama-file.js

# Batalkan semua perubahan (belum di-add)
git checkout -- .

# Batalkan file dari staging (tapi tetap simpan perubahan)
git reset HEAD nama-file.js

# Batalkan commit terakhir (tapi simpan perubahan)
git reset --soft HEAD~1

# Hapus commit terakhir dan semua perubahan (HATI-HATI!)
git reset --hard HEAD~1
```

### Cek Remote Repository

```bash
# Lihat remote repository
git remote -v

# Update remote URL (jika perlu)
git remote set-url origin https://github.com/mandalap/QuickNext.git
```

---

## ⚠️ Best Practices

### 1. **Commit Sering dan Berkala**
   - Jangan tunggu sampai banyak perubahan baru commit
   - Commit setiap fitur/perbaikan selesai
   - Lebih mudah untuk track dan rollback jika perlu

### 2. **Pesan Commit yang Jelas**
   - ✅ Baik: `"Fix: Update payroll filter ke date picker"`
   - ❌ Buruk: `"update"`, `"fix"`, `"changes"`

### 3. **Jangan Commit File Sensitif**
   - Jangan commit `.env` files
   - Jangan commit file dengan credentials
   - Selalu cek `git status` sebelum commit

### 4. **Pull Sebelum Push (Jika Bekerja Team)**
   ```bash
   git pull  # Ambil perubahan terbaru
   git push  # Push perubahan Anda
   ```

---

## 🚀 Quick Reference

### Update Repository (Ringkas)

```bash
git add .
git commit -m "Deskripsi perubahan"
git push
```

### Update Repository (Dengan Cek Status)

```bash
git status              # Cek perubahan
git add .               # Tambah semua perubahan
git commit -m "..."     # Commit
git push                # Push ke GitHub
```

### Jika Ada Conflict (Team Work)

```bash
git pull                # Ambil perubahan terbaru
# Resolve conflict (edit file yang conflict)
git add .
git commit -m "Resolve merge conflict"
git push
```

---

## 📝 Template Commit Message

Gunakan format berikut untuk commit message:

```
[Tipe]: Deskripsi singkat

[Opsional: Deskripsi detail jika perlu]
```

**Tipe yang umum digunakan:**
- `Fix:` - Perbaikan bug
- `Add:` - Menambah fitur baru
- `Update:` - Update fitur yang ada
- `Remove:` - Menghapus fitur/kode
- `Refactor:` - Refactor kode tanpa perubahan fungsi
- `Docs:` - Update dokumentasi
- `Style:` - Perubahan formatting/styling
- `Test:` - Menambah/update test

**Contoh:**
```bash
git commit -m "Fix: Tombol delete tidak muncul untuk payroll status cancelled"

git commit -m "Add: Fitur export laporan ke Excel"

git commit -m "Update: Landing page - ubah harga dari bulanan ke harian"
```

---

## 🎯 Summary

**Workflow update repository:**
1. `git status` - Cek perubahan
2. `git add .` - Tambah perubahan
3. `git commit -m "pesan"` - Commit
4. `git push` - Push ke GitHub

**Simple one-liner (jika yakin dengan perubahan):**
```bash
git add . && git commit -m "Update: deskripsi perubahan" && git push
```
