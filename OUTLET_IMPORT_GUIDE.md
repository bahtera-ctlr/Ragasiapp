# Outlet Data Import - Setup & Usage Guide

## Deskripsi Fitur
Fitur baru untuk sync data outlet ke system Ragasi, mirip seperti data barang yang sudah berjalan. Data outlet akan ter-update otomatis setiap kali upload CSV baru, sehingga informasi outlet di halaman keuangan, marketing, dan sales selalu konsisten.

## Setup Step-by-Step

### Step 1: Update Database Schema (WAJIB DIJALANKAN DULU)
1. Buka Supabase → SQL Editor
2. Copy seluruh isi file: `/database/add-outlets-columns.sql`
3. Paste ke SQL Editor
4. Klik "Run"
5. Expected: "Outlets table updated successfully"

### Step 2: Hard Refresh Browser
- Mac: `Cmd+Shift+R`
- Windows: `Ctrl+Shift+R`

### Step 3: Test Outlet Import
1. Login sebagai `admin_keuangan`
2. Navigasi ke halaman **Admin Keuangan**
3. Klik tab **"📥 Import Outlet"** (tab baru)
4. Upload CSV dengan format yang benar (lihat bagian Format CSV di bawah)
5. Tunggu "Berhasil upload X outlet!" message
6. Klik tab **"Data Outlet"** untuk lihat data yang baru di-upload

---

## CSV Format

### Struktur File
```
NIO, NAMA OUTLET, ME, CLUSTER, KELOMPOK, LIMIT, TOP, SALDO
```

### Penjelasan Kolom

| Kolom | Tipe | Keterangan | Contoh |
|-------|------|-----------|--------|
| **NIO** | BIGINT | Nomor Identifikasi Outlet (unik) | 1, 2, 100, 1001 |
| **NAMA OUTLET** | TEXT | Nama outlet (wajib diisi) | "AA KLINIK", "RUMAH SAKIT XYZ" |
| **ME** | TEXT | Marketing Executive yang handle outlet | "Ahmad", "Budi" |
| **CLUSTER** | TEXT | Menentukan level diskon order | "C1", "C2", "C3", "BM" |
| **KELOMPOK** | TEXT | Klasifikasi/unit usaha outlet | "Apotik", "Klinik", "Rumah Sakit" |
| **LIMIT** | NUMBER | Plafon/limit kredit dalam rupiah | 1000000, 5000000 |
| **TOP** | NUMBER | Tempo pembayaran dalam hari | 30, 45, 60 |
| **SALDO** | NUMBER | Sisa saldo yang tersedia | 500000, 2000000 |

### Contoh CSV Valid
```
NIO,NAMA OUTLET,ME,CLUSTER,KELOMPOK,LIMIT,TOP,SALDO
1,AA KLINIK,Ahmad,C1,Klinik,1000000,30,500000
2,BB APOTEK,Budi,C2,Apotik,2000000,45,1500000
3,CC RUMAH SAKIT,Citra,BM,Rumah Sakit,5000000,60,3000000
4,DD KLINIK PRATAMA,Deni,C3,Klinik,1500000,30,800000
100,EE KLINIK,Eka,C1,Klinik,1200000,45,600000
```

### Format Number Support
- Dengan separator: `1.000.000` atau `1,000,000` (akan otomatis diparse)
- Tanpa separator: `1000000` (juga OK)
- Kosong atau "-": Akan dianggap NULL

---

## Integration dengan Halaman Lain

### 1. Admin Keuangan (Sudah Terintegrasi)
**Outlet Data Tab** - Menampilkan:
- Nama outlet
- Cluster
- Tempo (TOP)
- Credit Limit
- Current Saldo

### 2. Sales Page (Sudah Ada)
Informasi outlet yang ditampilkan:
- **ME** (Marketing Executive)
- **Cluster** (untuk hitung diskon)
- **Credit Limit & Current Saldo** (untuk hitung available limit)

**Cara Integrasi Serah Jemput:**
Data outlet yang di-upload akan langsung sync dengan yang digunakan di sales page, karena keduanya query dari tabel `outlets` yang sama.

### 3. Marketing Dashboard
Dapat menampilkan jumlah order dan invoice yang di-handle per outlet berdasarkan ME.

---

## Auto-Cleanup & Data Update Behavior

Tidak seperti data barang yang delete semua data lama, sistem outlet menggunakan **UPSERT pattern**:

1. **Jika NIO sudah ada** → Data lama di-UPDATE dengan data baru
2. **Jika NIO baru** → Insert sebagai row baru
3. **Benefit**: Tidak ada foreign key conflict, semua existing orders/invoices tetap reference outlet dengan baik

Ini lebih aman untuk data keuangan yang sudah terintegrasi dengan orders & invoices!

---

## Troubleshooting

### Error: "Kolom 'Nama Outlet' tidak ditemukan"
→ Pastikan CSV header ada kolom "NAMA OUTLET" atau "nama" atau "outlet"

### Error: "NIO sudah exists"
→ Nomor identifikasi outlet sudah terdaftar di database sebelumnya
→ Gunakan NIO yang berbeda atau update data existing

### Data tidak muncul setelah upload
→ Hard refresh browser (`Cmd+Shift+R`)
→ Atau klik tab "Data Outlet" untuk refresh data

### Error "Gagal insert outlet"
→ Periksa format CSV, khususnya kolom LIMIT dan TOP
→ Pastikan tidak ada karakter khusus yang aneh
→ Coba buka CSV dengan text editor vs Excel (Excel kadang bisa corrupt format)

---

## File yang Dibuat/Diupdate

### New Files
- `/database/add-outlets-columns.sql` - Migration untuk add kolom ke outlets table
- `/lib/outlets.ts` - Logic untuk parse CSV dan upload outlet

### Modified Files
- `/app/admin-keuangan/page.tsx` - Add "📥 Import Outlet" tab dengan upload UI

### Tetap Aman
✅ Logic marketing, sales, invoice - **TIDAK BERUBAH**
✅ Semua existing functionality - **TETAP BERJALAN**
✅ Hanya menambah fitur baru - **ZERO BREAKING CHANGES**

---

## Best Practices

1. **Backup CSV sebelum upload** - Simpan copy filenya
2. **Test di outlet kecil dulu** - Upload beberapa outlet untuk test
3. **Validate nomor ME** - Pastikan ME names match dengan yang ada di system
4. **Check cluster notation** - Gunakan "C1", "C2", "C3", atau "BM" (sesuai sales page logic)
5. **Number format consistency** - Gunakan format yang sama untuk semua baris (all dots atau all commas)

---

## Next Steps

Setelah setup successful:
1. Reguler update outlet data (setelah ada perubahan limit, tempo, saldo)
2. Monitor di tab "Data Outlet" untuk memastikan data selalu fresh
3. Coordinate dengan team untuk standardisasi CSV format
4. Consider automation jika ada billing system yang bisa auto-export outlet data
