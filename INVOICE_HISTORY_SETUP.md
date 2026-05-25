# 📋 Setup Historis Penjualan (Invoice History)

## 📖 Deskripsi

Fitur **Historis Penjualan** memungkinkan Super Admin untuk mengimport data historis penjualan/faktur dari CSV file ke dalam sistem. Data ini akan disimpan di tabel `invoice_history` dan dapat diakses serta difilter di halaman Super Admin.

---

## 🔧 Langkah Setup

### Step 1: Jalankan SQL Migration

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy seluruh isi file `database/create-invoice-history-table.sql`
3. Paste ke SQL Editor dan jalankan (klik **Run**)

**Apa yang dilakukan:**
- ✅ Drop tabel `withdrawal_history` lama (jika ada)
- ✅ Buat tabel `invoice_history` dengan kolom-kolom sesuai struktur CSV
- ✅ Setup RLS policies untuk akses data
- ✅ Buat indexes untuk query performance

---

### Step 2: Verifikasi Tabel di Supabase

1. Buka **Supabase Dashboard** → **Table Editor**
2. Cari tabel `invoice_history` di sidebar
3. Verifikasi kolom-kolom ada (gudang, no_faktur, salesman, etc.)

---

## 📊 Struktur Tabel `invoice_history`

| Kolom | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `id` | UUID | ✅ | Primary key (auto-generated) |
| `gudang` | TEXT | ❌ | Asal stok barang |
| `no_faktur` | BIGINT | ❌ | Nomor faktur dari Zahir |
| `salesman` | TEXT | ❌ | Nama petugas fakturis |
| `no_outlet` | BIGINT | ❌ | Nomor identifikasi outlet |
| `outlet_id` | UUID | ❌ | Foreign key ke tabel outlets |
| `nama_barang` | TEXT | ✅ | Nama barang / SKU |
| `tgl` | DATE | ✅ | Tanggal faktur tercetak |
| `qty` | TEXT | ❌ | Quantity barang |
| `sat` | TEXT | ❌ | Satuan (unit) |
| `disc` | NUMERIC | ❌ | Diskon barang |
| `dpp` | NUMERIC | ❌ | Nilai sebelum PPN |
| `penjualan` | NUMERIC | ❌ | Nilai setelah PPN |
| `bln` | INTEGER | ❌ | Bulan (1-12) |
| `principle` | TEXT | ❌ | Perusahaan dagang farmasi |
| `komposisi` | TEXT | ❌ | Jenis isi obat |
| `me` | TEXT | ❌ | Marketing Executive |
| `lh_lb` | TEXT | ❌ | Program (renamed from lh/lb) |
| `created_by` | UUID | ❌ | User yang upload |
| `created_at` | TIMESTAMP | ✅ | Waktu record dibuat |
| `updated_at` | TIMESTAMP | ❌ | Waktu record diupdate |

---

## 📥 Format CSV Upload

### Header CSV

```csv
gudang,no_faktur,salesman,no_outlet,nama_barang,tgl,qty,sat,disc,dpp,penjualan,bln,principle,komposisi,me,lh_lb
```

### Contoh Data

```csv
gudang,no_faktur,salesman,no_outlet,nama_barang,tgl,qty,sat,disc,dpp,penjualan,bln,principle,komposisi,me,lh_lb
Gudang A,1001,Budi,101,Paracetamol 500mg,2024-05-23,100,Box,,150000,180000,5,PT Pharma,Tablet,Anto,Program A
Gudang B,1002,Rina,102,Ibuprofen 400mg,2024-05-23,50,Box,10000,100000,110000,5,PT Farma,Caplet,Siti,Program B
Gudang A,1003,Budi,103,Vitamin C,2024-05-24,200,Botol,,200000,250000,5,PT Health,Tablet,Anto,Program A
```

### Catatan CSV

- **Kolom WAJIB**: `nama_barang`, `tgl` (format: YYYY-MM-DD)
- **Kolom opsional**: Semua kolom lain bisa kosong
- **Separator**: Gunakan `,` (comma)
- **Encoding**: UTF-8
- **Header harus ada** di baris pertama
- **Kolom bisa dalam urutan berbeda** - parser akan otomatis match nama kolom
- **Jika ada kolom `lh/lb`** - akan otomatis di-convert ke `lh_lb`
- **Nilai kosong** akan disimpan sebagai `NULL` di database

---

## 🚀 Cara Menggunakan di Aplikasi

### 1. Login sebagai Super Admin
- Masuk ke aplikasi dengan akun Super Admin

### 2. Buka Tab "📋 Historis Penjualan"
- Di dashboard Super Admin, klik tab **"📋 Historis Penjualan"**

### 3. Upload CSV
1. Klik tombol **"📤 Upload CSV"**
2. Modal akan terbuka dengan instruksi format
3. Klik **"📥 Template"** untuk download template CSV
4. Edit template dengan data Anda
5. Pilih file CSV yang sudah diisi
6. File akan otomatis diparse dan diupload ke database
7. Lihat pesan konfirmasi "X data berhasil di-upload!"

### 4. Filter & Lihat Data
- **Filter by Outlet**: Dropdown untuk pilih outlet tertentu
- **Filter by Periode**: Pilih All, Bulan ini, 3 bulan, 6 bulan
- **Filter by Tanggal**: Input date untuk filter dari tanggal tertentu
- **Tabel menampilkan**:
  - No Faktur
  - Tanggal
  - Outlet
  - Nama Barang
  - Qty
  - Satuan
  - Harga (Penjualan)
  - Salesman
  - Marketing Executive
  - Principle

---

## 💻 Technical Implementation

### File-file yang diubah:

#### 1. `database/create-invoice-history-table.sql` (BARU)
- SQL script untuk membuat tabel `invoice_history`
- Setup RLS policies
- Create indexes

#### 2. `lib/discount-requests.ts`
- Interface `InvoiceHistory` ditambahkan
- Fungsi `getAllInvoiceHistory()` - fetch semua data
- Fungsi `batchInsertInvoiceHistory()` - batch insert dari CSV

#### 3. `app/admin-super/page.tsx`
- Import `getAllInvoiceHistory`, `batchInsertInvoiceHistory`, `InvoiceHistory`
- State: `invoiceHistory`, `loadingHistory`, `showUploadModal`, `uploadingCSV`
- Fungsi `fetchInvoiceHistory()` - fetch data dari database
- Fungsi `handleUploadCSV()` - parse CSV dan insert batch
- UI: Tab "📋 Historis Penjualan" dengan filter dan data table

### CSV Parser Logic:

```typescript
// 1. Read CSV file
const lines = file.text().split('\n')

// 2. Extract headers dari baris pertama
const headers = lines[0].split(',')

// 3. Map header names ke column indices
const headerMap: Record<string, number> = {}

// 4. Loop setiap row (skip empty rows)
for (let row of rows) {
  // 5. Map values ke kolom berdasarkan header index
  // 6. Parse numbers, dates sesuai tipe kolom
  // 7. Validate data (nama_barang & tgl wajib)
}

// 8. Batch insert ke Supabase
await batchInsertInvoiceHistory(records)
```

---

## ✅ Checklist Post-Setup

- [ ] SQL migration berhasil dijalankan
- [ ] Tabel `invoice_history` ada di Supabase
- [ ] Download template CSV dari modal
- [ ] Isi template dengan data test (minimal 2-3 rows)
- [ ] Upload CSV test
- [ ] Verifikasi data muncul di tabel
- [ ] Filter by outlet works
- [ ] Filter by periode works
- [ ] Filter by tanggal works
- [ ] Download template memberikan file CSV valid

---

## 🐛 Troubleshooting

### ❌ Error: "File CSV kosong atau tidak valid"
**Solusi:**
- Pastikan file CSV memiliki minimal 2 baris (header + 1 data)
- Cek apakah file terbuka di Excel? Close terlebih dahulu sebelum upload

### ❌ Error: "Tidak ada data valid di file CSV"
**Solusi:**
- Pastikan kolom `nama_barang` dan `tgl` terisi untuk setiap row
- Format tanggal harus YYYY-MM-DD (contoh: 2024-05-23)
- Tidak ada trailing whitespace di nama kolom

### ❌ Error: "Only super admin can import invoice history"
**Solusi:**
- Verifikasi user login adalah Super Admin
- Cek di database users table apakah role = 'super_admin'

### ❌ Data tidak muncul di tabel setelah upload
**Solusi:**
1. Buka browser dev tools (F12) → Console
2. Cek apakah ada error JavaScript
3. Cek Supabase → Table Editor → invoice_history
4. Verifikasi RLS policies memungkinkan read untuk authenticated users
5. Refresh halaman (Ctrl+R)

### ❌ CSV dengan kolom lh/lb error
**Solusi:**
- Parser otomatis convert `lh/lb` → `lh_lb`
- Jika masih error, rename kolom di CSV menjadi `lh_lb`

---

## 📝 Contoh CSV Lengkap

Simpan ini sebagai file `.csv`:

```
gudang,no_faktur,salesman,no_outlet,nama_barang,tgl,qty,sat,disc,dpp,penjualan,bln,principle,komposisi,me,lh_lb
Gudang Jakarta,1001,Budi Santoso,101,Paracetamol 500mg Tablet,2024-05-23,100,Box,50000,150000,180000,5,PT Pharma Indonesia,Tablet,Anto Wijaya,Program Utama
Gudang Bandung,1002,Rina Kusuma,102,Ibuprofen 400mg Caplet,2024-05-23,50,Box,10000,100000,110000,5,PT Farma Sejahtera,Caplet,Siti Nur,Program Bonus
Gudang Jakarta,1003,Budi Santoso,103,Vitamin C 500mg,2024-05-24,200,Botol,20000,200000,250000,5,PT Health Plus,Vitamin,Anto Wijaya,Program Utama
Gudang Surabaya,1004,Ahmad Rizki,104,Omeprazole 20mg,2024-05-24,75,Strip,15000,300000,350000,5,PT Medis Lab,Capsule,Rudi Haryanto,Program Bonus
```

---

## 🎯 Next Steps

Setelah setup:
1. **Import data historis** dari CSV files yang sudah Anda miliki
2. **Verifikasi data** di halaman Super Admin
3. **Gunakan filter** untuk analyze penjualan per outlet/period
4. **Monitoring** data secara berkala via halaman Historis Penjualan

---

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Buka file ini kembali untuk referensi
2. Cek Supabase logs untuk SQL errors
3. Buka browser console (F12) untuk JavaScript errors
4. Verifikasi RLS policies di Supabase Dashboard → Authentication → Policies

---

**Last Updated**: May 23, 2024
**Version**: 1.0
