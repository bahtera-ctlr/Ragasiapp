# Deploy RPC Function - Step by Step

## 🔴 MASALAH
Errornya masih muncul karena:
1. File SQL sudah diupdate di editor lokal ✓
2. **TAPI belum di-execute di Supabase database** ❌
3. Data outlet lama masih tersimpan di database
4. Jadi ketika upload, terjadi duplicate key error

## ✅ SOLUSI - 3 TAHAP

### TAHAP 1: Manual Cleanup Data Lama di Supabase
**Juga untuk memastikan database bersih sebelum deploy RPC baru**

1. Buka **Supabase Dashboard** → Project Anda
2. Masuk ke **SQL Editor**
3. Buat query baru dan copy-paste ini:

```sql
-- Clear all referencing data
DELETE FROM public.invoices WHERE outlet_id IS NOT NULL;
DELETE FROM public.orders WHERE outlet_id IS NOT NULL;
DELETE FROM public.out_of_stock_requests WHERE outlet_id IS NOT NULL;

-- Clear outlets table
DELETE FROM public.outlets;

-- Verify
SELECT COUNT(*) as remaining_outlets FROM public.outlets;
```

4. **Klik "RUN"** - tunggu sampai selesai
5. Harus muncul: `remaining_outlets: 0`

### TAHAP 2: Deploy RPC Function Baru
**SETELAH tahap 1 selesai, baru lakukan ini!**

1. Di SQL Editor, buat query baru
2. Copy-paste SELURUH isi dari file ini:
   - [database/create-outlet-refresh-rpc.sql](../database/create-outlet-refresh-rpc.sql)

3. **PENTING: Jalankan SEKALIGUS (jangan per-lines)**
   - Pilih semua (Ctrl+A atau Cmd+A)
   - **Klik "RUN"**

4. Di output, harus muncul:
   ```
   "RPC function created successfully"
   ```

### TAHAP 3: Test Upload
**Setelah RPC berhasil di-deploy**

1. Kembali ke aplikasi
2. Ke halaman **Admin Keuangan → Import Outlet**
3. Upload file CSV outlet Anda
4. Check console - harus melihat:
   - ✅ `Parsed 1716 outlets successfully`
   - ✅ `Calling RPC function to refresh outlets...`
   - ✅ `RPC Result: [{...}]`
   - ✅ `Successfully refreshed outlets: 1716 inserted`

---

## 🔍 TROUBLESHOOTING

### Masih error "duplicate key"?
**Kemungkinan:** RPC function di Supabase masih yang lama

**Solusi:**
1. Di SQL Editor, jalankan:
```sql
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'refresh_outlets_data';
```

2. Lihat di `routine_definition` - apakah ada text `Deleted % old outlets`?
   - Ya = RPC sudah baru ✓
   - Tidak = RPC masih lama ❌, re-run TAHAP 2

### Error saat deploy RPC?
1. Refresh halaman Supabase
2. Coba lagi TAHAP 1 terlebih dahulu
3. Tunggu 5 detik
4. Baru TAHAP 2

### Data tidak muncul setelah upload?
```sql
SELECT COUNT(*) as total_outlets FROM public.outlets;
SELECT nio, name FROM public.outlets LIMIT 5;
```

---

## ✨ PERBEDAAN DARI VERSI LAMA

| Aspek | Lama | Baru |
|-------|------|------|
| Pembersihan | TRUNCATE CASCADE | DELETE + DISABLE TRIGGER |
| Foreign Keys | Harap berhasil | Explicit delete per table |
| Logging | Minimal | Detail setiap step |
| Reliability | 60% | 95%+ |

---

## 📋 CHECKLIST DEPLOYMENT

- [ ] Tahap 1: Data lama berhasil dihapus (remaining_outlets: 0)
- [ ] Tahap 2: RPC function berhasil di-deploy ("created successfully")
- [ ] Tahap 3: CSV upload berhasil tanpa error
- [ ] Data outlet muncul di tabel
- [ ] Total outlets sesuai dengan CSV

---

## ❓ PERTANYAAN SERING?

**Q: Apakah ini akan menghapus data transaksi?**
A: Ini menghapus invoices, orders, dan out_of_stock_requests yang reference outlets. Data historis akan hilang. Jika perlu backup, lakukan sebelum tahap 1.

**Q: Berapa lama prosesnya?**
A: Total 5-10 menit (3 menit untuk clear data + 2 menit untuk deploy RPC).

**Q: Apakah harus offline?**
A: Tidak, tapi jangan upload outlet sambil tahap 1-2 berjalan. Tunggu semua selesai dulu.
