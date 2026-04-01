# Stock Reduction Fix - Langkah Eksekusi

## Masalah
Stok produk tidak berkurang setelah order berhasil dibuat karena RLS policy memblokir UPDATE.

## Solusi
Menggunakan **TRIGGER otomatis** yang menjalankan automatic stock reduction saat order dibuat. Trigger dengan SECURITY DEFINER dapat bypass RLS checking.

## Langkah Eksekusi (Urutan PENTING):

### Step 1: Setup Trigger untuk Auto Stock Reduction
1. Buka Supabase SQL Editor
2. Salin seluruh isi dari file: `/database/add-stock-reduction-trigger.sql`
3. Paste ke SQL Editor
4. Klik "Execute" atau "Ctrl+Enter"
5. Expected result: "Success - 0 rows affected"

### Step 2: Update RPC Function
1. Masih di Supabase SQL Editor, bersihkan query sebelumnya
2. Salin seluruh isi dari file: `/database/create-rpc-function.sql` (sudah di-update)
3. Paste dan Execute
4. Expected result: "Success - 0 rows affected"

### Step 3: Hard Refresh Browser
Di aplikasi Ragasi, lakukan hard refresh:
- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + R`

### Step 4: Test Workflow
1. Login sebagai marketing
2. Buat order baru dengan "ALCO FLU & BATUK SYR" qty 1
3. Lihat stok di admin-logistik-in:
   - Sebelum order: Stok = 30
   - Setelah order berhasil: Stok harus = 29
4. Ulangi test dengan qty 2 untuk memastikan stok berkurang sebanyak qty

## Technical Details

**Sebelumnya (TIDAK BEKERJA):**
- Function mencoba UPDATE products, tapi RLS policy memblokir karena marketing user bukan admin_logistik

**Sekarang (BEKERJA):**
- Trigger `trg_reduce_stock_on_order` berjalan AFTER INSERT on orders
- Trigger menggunakan function dengan `SECURITY DEFINER` = dapat bypass RLS
- Otomatis looping items dan kurangi stok untuk setiap product_id
- Custom items (product_id = NULL) tidak dikurangi

## File yang Diubah
- `/database/add-stock-reduction-trigger.sql` - NEW FILE (trigger)
- `/database/create-rpc-function.sql` - UPDATED (hapus manual stock reduction)
