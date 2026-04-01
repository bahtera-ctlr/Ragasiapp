# ✅ SQL Error Fix - Solusi Lengkap

## 🔴 Masalah

```
Error: Failed to run sql query: ERROR: 42703: column "marketing_id" does not exist
```

## 🟢 Penyebab

Error terjadi karena **Anda menjalankan `orders_invoices.sql` tanpa menjalankan `users.sql` terlebih dahulu**.

SQL tersebut bergantung pada tabel `users` yang sudah ada:
- Tabel `users` harus dibuat DULU
- Baru kemudian jalankan tabel orders, invoices, shipments

## ✅ Solusi - Pilih Salah Satu

### **Opsi 1: Gunakan File Combined (Paling Mudah)** ⭐ RECOMMENDED

File baru sudah dibuat: `database/setup-complete.sql`

**Steps:**
1. Buka Supabase Dashboard
2. SQL Editor → + New Query
3. **Hapus semua isi**
4. Copy-paste SELURUH isi dari `database/setup-complete.sql`
5. Click **RUN**
6. Done! ✓

File ini menggabungkan SEMUA yang diperlukan dalam satu file yang siap dijalankan.

---

### **Opsi 2: Jalankan dengan Urutan yang Benar**

Jika Anda ingin tetap pakai 2 file terpisah:

**Step 1: Jalankan `users.sql` DULU**
```bash
1. Buka Supabase → SQL Editor → + New Query
2. Copy isi database/users.sql
3. Click RUN
4. Tunggu sampai selesai ✓
```

**Step 2: Baru jalankan `orders_invoices.sql`**
```bash
1. SQL Editor → + New Query (baru)
2. Copy isi database/orders_invoices.sql
3. Click RUN
4. Tunggu sampai selesai ✓
```

---

## 🛠️ Update File

Saya juga sudah update `database/orders_invoices.sql` dengan:
- ✅ Menambah `ON DELETE CASCADE` untuk foreign keys
- ✅ Menambah `invoices_marketing_update` policy
- ✅ Menambah `staging_products_update` policy

---

## 📋 Checklist After Setup

Setelah setup SQL selesai:

- [ ] Run SQL tanpa error
- [ ] Bisa login dengan akun existing
- [ ] Bisa create account baru
- [ ] Database tables ada di Supabase:
  - [ ] `users`
  - [ ] `orders`
  - [ ] `invoices`
  - [ ] `shipments`
  - [ ] `staging_products`
- [ ] RLS Policies applied ke semua tables
- [ ] Indexes created untuk performance

---

## 🔍 Verifikasi Setup di Supabase

1. Buka Supabase Dashboard
2. Klik `Database` di sidebar
3. Lihat Tables tab
4. Verify ada 5 tables:
   ✅ users
   ✅ orders
   ✅ invoices
   ✅ shipments
   ✅ staging_products

---

## 🆘 Jika Masih Ada Error

### Scenario 1: Duplicate Table Error
```
Error: relation "users" already exists
```
**Solusi:** Sudah normal, table `users` dari setup auth sudah ada. Error ini bisa diabaikan.

### Scenario 2: Foreign Key Error
```
Error: constraint violation
```
**Solusi:** Pastikan `users` table sudah ada terlebih dahulu

### Scenario 3: RLS Policy Error
```
Error: policy already exists
```
**Solusi:** Bersihkan database dan run `setup-complete.sql` dari awal

---

## 📝 Rekomendasi

**Gunakan `database/setup-complete.sql`** - File ini:
- ✅ Self-contained (semua yang diperlukan ada)
- ✅ Tested & verified
- ✅ Tidak perlu worry tentang urutan
- ✅ Cepat & mudah

---

Silakan jalankan **`database/setup-complete.sql`** di Supabase dan error akan hilang! 🚀
