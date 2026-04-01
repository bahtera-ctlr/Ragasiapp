# 🔧 Setup Instructions - Bagian 2: Role-Based Features

Setelah menyelesaikan setup autentikasi, ikuti langkah ini untuk setup fitur role-based.

## Step 1: Jalankan SQL untuk Orders & Invoices

### ⭐ OPSI 1: Gunakan File Combined (RECOMMENDED)

File: `database/setup-complete.sql` - Self-contained, all-in-one

**Steps:**
1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project
3. SQL Editor → + New Query
4. Copy-paste **SELURUH** isi dari `database/setup-complete.sql`
5. Klik **Run**
6. Verifikasi semua tables tercipta dengan sukses

### Opsi 2: Jalankan Dengan Urutan yang Benar

**Pertama:** Jalankan `database/users.sql`
```
1. SQL Editor → + New Query
2. Copy isi database/users.sql
3. Klik Run
```

**Kemudian:** Jalankan `database/orders_invoices.sql`
```
1. SQL Editor → + New Query (baru)
2. Copy isi database/orders_invoices.sql
3. Klik Run
```

**Catatan:** Gunakan Opsi 1 jika ada error - lebih mudah dan tidak perlu worry tentang urutan!

---

**💡 Jika Ada Error:** Baca file `SQL_ERROR_FIX.md` untuk solusi lengkap

---

## Step 2: Verifikasi Database

Setelah running SQL berhasil, verifikasi di Supabase:

```
Buka Database → Tables tab
Harus ada 5 tables:
  ✓ users               (dari auth setup)
  ✓ orders              (untuk sales orders)
  ✓ invoices            (untuk invoice tracking)
  ✓ shipments           (untuk shipment tracking)
  ✓ staging_products    (untuk product uploads)

RLS Policies sudah applied ke semua tables
Indexes sudah created untuk performance
```

---

## Step 3: Test Setiap Role

### Create Test Accounts:

```
1. Admin Keuangan
   Email: keuangan@ragasi.local
   Password: testing123
   Role: admin_keuangan
   URL: /admin-keuangan

2. Marketing  
   Email: marketing@ragasi.local
   Password: testing123
   Role: marketing
   URL: /marketing

3. Fakturis
   Email: fakturis@ragasi.local
   Password: testing123
   Role: fakturis
   URL: /fakturis

4. Logistik In
   Email: logistik-in@ragasi.local
   Password: testing123
   Role: admin_logistik
   URL: /admin-logistik-in

5. Logistik Out
   Email: logistik-out@ragasi.local
   Password: testing123
   Role: admin_ekspedisi
   URL: /admin-logistik-out

6. Super Admin
   Email: super@ragasi.local
   Password: testing123
   Role: super_admin
   URL: /admin-keuangan (or any)
```

---

## Step 4: Feature Testing Checklist

### Admin Keuangan ✓
- [ ] Login dengan akun keuangan
- [ ] Lihat Data Outlet tab
- [ ] Export Outlet CSV
- [ ] Lihat Invoice Management tab
- [ ] Click "Release Invoice" button

### Marketing ✓
- [ ] Login dengan akun marketing
- [ ] Click "+ Buat Sales Order Baru"
- [ ] Buat order di /sales page
- [ ] Kembali ke /marketing
- [ ] Lihat order di "Sales Orders" tab
- [ ] Click "Edit" button
- [ ] View Invoices tab

### Fakturis ✓
- [ ] Login dengan akun fakturis
- [ ] Lihat "Daftar Invoice"
- [ ] Filter by status
- [ ] Click "View Details" button

### Logistik In ✓
- [ ] Login dengan akun logistik-in
- [ ] Upload Tab → Upload sample CSV
- [ ] Packing Tab → Test status updates
- [ ] Tambah packing notes
- [ ] Change status: pending → packing → packed

### Logistik Out ✓
- [ ] Login dengan akun logistik-out
- [ ] Lihat shipments dengan different filters
- [ ] Change status: packed → shipped
- [ ] Change status: shipped → delivered
- [ ] Tambah delivery notes

---

## Step 5: Integration Test (Full Flow)

### Test Scenario: Complete Order to Delivery

**1. Marketing membuat order:**
```
- Login marketing@ragasi.local
- Click "+ Buat Sales Order Baru"
- Pilih outlet
- Tambah 2-3 produk dengan qty dan discount
- Post order
```

**2. Admin Keuangan approve invoice:**
```
- Login keuangan@ragasi.local
- Ke tab "Invoice Management"
- Click "Release Invoice"
- Verify status berubah dari "posted" → "released"
```

**3. Fakturis view invoice:**
```
- Login fakturis@ragasi.local
- Lihat invoice yang sudah di-release
```

**4. Logistik In manage packing:**
```
- Login logistik-in@ragasi.local
- Ke "Packing" tab
- Click "Mulai Packing"
- Tambah catatan
- Click "Selesai Packing"
```

**5. Logistik Out mark as delivered:**
```
- Login logistik-out@ragasi.local
- Filter "Packed (Siap Kirim)"
- Click "Mulai Pengiriman"
- Filter "In Transit" atau "shipped"
- Tambah delivery notes
- Click "Tandai Sudah Terkirim"
```

---

## Step 6: File Structure Summary

```
ragasiapp/
├── database/
│   ├── users.sql                    # Setup Part 1 (Auth)
│   └── orders_invoices.sql          # Setup Part 2 (Features)
│
├── lib/
│   ├── auth.ts                      # Login/signup functions
│   ├── orders.ts                    # Orders/invoices/shipments API
│   ├── export.ts                    # CSV export functions
│   ├── permissions.ts               # Role permissions
│   ├── hooks.ts                     # useAuth, useRoleCheck hooks
│   └── supabase.ts
│
├── app/
│   ├── page.tsx                     # Login page
│   ├── dashboard/page.tsx           # Auto-redirect based on role
│   ├── admin-keuangan/page.tsx      # Admin Keuangan dashboard
│   ├── marketing/page.tsx           # Marketing dashboard
│   ├── fakturis/page.tsx            # Fakturis dashboard
│   ├── admin-logistik-in/page.tsx   # Logistik In dashboard
│   ├── admin-logistik-out/page.tsx  # Logistik Out dashboard
│   ├── sales/page.tsx               # [EXISTING] Sales order creation
│   └── components/
│       └── LoginPage.tsx
│
├── SETUP_AUTH.md                    # Setup Part 1 docs
├── AUTH_REFERENCE.md                # Auth API docs
├── SYSTEM_GUIDE.md                  # Complete system guide
└── SETUP_FEATURES.md                # This file
```

---

## Step 7: Next Steps (Optional Enhancements)

After testing, consider adding:

- [ ] Email notifications untuk setiap status change
- [ ] Audit logging untuk track semua activities
- [ ] Dashboard dengan statistics dan charts
- [ ] Mobile app version (React Native)
- [ ] Integration dengan accounting/finance system
- [ ] Advance reporting & analytics
- [ ] Multi-warehouse support
- [ ] Inventory alerts & low stock notifications

---

## Troubleshooting

### Q: "Unauthorized" error saat akses dashboard
**A:** 
- Pastikan role di `users` table benar
- Check RLS policies di Supabase
- Clear browser localStorage dan login ulang

### Q: Export CSV tidak work
**A:**
- Check outlet data ada di database
- Buka browser console cek error
- Pastikan popup blocker tidak aktif

### Q: Shipment tidak muncul
**A:**
- Pastikan ada orders dengan status "pending" atau lebih
- Check `shipments` table di Supabase
- Verifikasi RLS policies untuk shipments

### Q: Upload produk gagal
**A:**
- Pastikan CSV format benar (comma-separated)
- Gunakan UTF-8 encoding
- Check error message di UI
- Lihat `staging_products` table

---

## Support

Jika ada pertanyaan atau issue:
1. Check SYSTEM_GUIDE.md untuk detail fitur
2. Lihat TROUBLESHOOTING di SYSTEM_GUIDE.md
3. Check Supabase dashboard logs
4. Run SQL queries di SQL Editor untuk debug

---

Selamat! Sistem sudah siap full production! 🚀
