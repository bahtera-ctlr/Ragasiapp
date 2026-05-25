# Perubahan: Tampilkan Outlet Name dari CSV Tanpa Fetch Database

## 📋 Ringkasan Masalah
Sebelumnya, tabel historis pembelian di halaman Super Admin melakukan fetch ke tabel `outlets` untuk mendapatkan nama outlet, padahal nama outlet sudah tersedia di CSV yang diupload.

## ✅ Solusi yang Diterapkan

### 1. **Tambah Kolom `outlet_name` ke Tabel**
```sql
-- File: database/add-outlet-name-to-invoice-history.sql
ALTER TABLE invoice_history
ADD COLUMN outlet_name TEXT;

CREATE INDEX IF NOT EXISTS idx_invoice_history_outlet_name ON invoice_history(outlet_name);
```

**Langkah eksekusi:**
- Login ke Supabase
- Buka SQL Editor
- Jalankan script di `database/add-outlet-name-to-invoice-history.sql`

### 2. **Update CSV Parser** 
File: `app/admin-super/page.tsx`

**Perubahan:**
- Menambahkan deteksi kolom `outlet_name` dalam CSV header
- Menambahkan fuzzy matching untuk variasi nama kolom:
  - `nama_outlet`, `outlet`, `toko`, `distributor`, dll.
- Mengekstrak nilai `outlet_name` saat parsing CSV
- Menyimpan `outlet_name` ke dalam record sebelum diinsert

**Kode yang ditambahkan:**
```javascript
// Di header mapping - tambahan fuzzy map
'nama_outlet': 'outlet_name',
'outlet': 'outlet_name',
'toko': 'outlet_name',
'distributor': 'outlet_name',

// Di record creation
outlet_name: getValueByColumn('outlet_name'),
```

### 3. **Simplify `fetchInvoiceHistory`**
File: `app/admin-super/page.tsx`

**Perubahan:**
- ❌ Hapus fetch ke tabel `outlets` untuk mapping NIO → nama outlet
- ✅ Gunakan `outlet_name` langsung dari kolom `outlet_name` yang sudah ada di record
- ✅ Fallback ke `Outlet ${r.no_outlet}` jika `outlet_name` kosong

**Benefit:**
- **Lebih cepat**: Tidak perlu fetch data tambahan dari database
- **Lebih reliabel**: Menggunakan data dari sumber asli (CSV)
- **Lebih efisien**: Mengurangi beban query ke database

## 📝 CSV Format yang Didukung
Kolom outlet name bisa dinamakan:
- `outlet_name`
- `nama_outlet`
- `outlet`
- `nama outlet`
- `toko`
- `distributor`

Parser akan otomatis mendeteksi dan memetakan ke kolom `outlet_name`.

## 🧪 Testing Checklist
- [ ] Jalankan SQL script di Supabase
- [ ] Upload CSV dengan kolom outlet name
- [ ] Verifikasi nama outlet tampil di tabel tanpa delay
- [ ] Periksa di browser console tidak ada error "fetching outlets"
- [ ] Filter outlet bekerja dengan baik

## 📊 Data Migration (Opsional)
Untuk data lama yang sudah ada, bisa diupdate dengan script:
```sql
-- Update outlet_name dari outlet_id jika ada
UPDATE invoice_history
SET outlet_name = outlets.name
FROM outlets
WHERE invoice_history.outlet_id = outlets.id
AND invoice_history.outlet_name IS NULL;
```

## 🎯 Hasil Akhir
✅ Halaman historis pembelian sekarang:
1. Tidak fetch data outlet dari database saat load
2. Menampilkan nama outlet dari CSV langsung
3. Lebih cepat dan responsif
4. Tetap support fallback jika outlet_name kosong
