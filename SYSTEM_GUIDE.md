# 📋 Sistem Manajemen Inventory - Panduan Fitur Lengkap

## 🚀 Quick Start

### 1. Setup Database di Supabase

Jalankan SQL di Supabase dashboard:

```bash
# File 1: database/users.sql
# File 2: database/orders_invoices.sql
```

### 2. Login & Dashboard

- URL: `http://localhost:3000`
- Setiap role akan otomatis di-redirect ke dashboard mereka

---

## 👥 Role & Dashboard

### 1. **Admin Keuangan** (`admin_keuangan`)
   - **URL**: `/admin-keuangan`
   - **Fitur**:
     - 📥 **Export Data Outlet ke CSV**: Download semua data outlet dalam format CSV
     - 📋 **Approve Invoice**: Review dan release invoice dari marketing
     - 👁️ **Monitor Cash Flow**: Lihat status dan jumlah invoice

   **Workflow**:
   1. Marketing membuat sales order
   2. Invoice di-generate dari order
   3. Fakturis/Marketing post invoice
   4. Admin Keuangan review dan release (approve)

---

### 2. **Marketing** (`marketing`)
   - **URL**: `/marketing`
   - **Fitur**:
     - 📝 **Create Sales Order**: Buat order baru ke /sales page
     - 📊 **View Sales Orders**: Lihat semua order yang sudah dibuat
     - ✏️ **Edit Orders**: Edit order yang masih pending
     - 📄 **Invoice Management**: Lihat invoice dari orders

   **Workflow**:
   1. Klik "+ Buat Sales Order Baru" → Redirect ke `/sales`
   2. Isi outlet, pilih produk, set qty dan discount
   3. Post order → Order tersimpan di database
   4. Lihat di "Sales Orders" tab
   5. Bisa edit order yang masih pending
   6. Post invoice dari order

---

### 3. **Fakturis** (`fakturis`)
   - **URL**: `/fakturis`
   - **Fitur**:
     - 📋 **View All Invoices**: Lihat semua invoice dari semua marketing
     - 🔍 **Filter by Status**: Filter berdasarkan status (posted, released, paid)
     - 📊 **Invoice Statistics**: Total amount dan count

   **Workflow**:
   1. Lihat invoice yang di-post oleh marketing
   2. Monitor status (posted → released → paid)
   3. Tidak bisa edit, hanya view

---

### 4. **Admin Logistik (IN)** (`admin_logistik`)
   - **URL**: `/admin-logistik-in`
   - **Fitur**:
     - 📤 **Upload Produk**: Upload file CSV untuk tambah produk ke staging
     - 📦 **Manage Packing**: Ubah status pesanan (pending → packing → packed)
     - 📝 **Add Packing Notes**: Tambahkan catatan untuk setiap shipment

   **Workflow**:
   1. **Upload Tab**:
      - Upload file CSV berisi data produk
      - Format: `id,name,price,stock,gol,komposisi`
      - Data tersimpan di `staging_products` table

   2. **Packing Tab**:
      - Lihat shipment yang butuh dikemas
      - Klik "Mulai Packing" → status menjadi "packing"
      - Tambah catatan packing (berat, dimensi, dll)
      - Klik "Selesai Packing" → status menjadi "packed"

---

### 5. **Admin Ekspedisi** (`admin_ekspedisi`)
   - **URL**: `/admin-logistik-out`
   - **Fitur**:
     - 🚚 **Monitor Shipment**: Lihat status pengiriman
     - 📦 **Initiate Delivery**: Mulai pengiriman (packed → shipped)
     - ✓ **Mark as Delivered**: Tandai sudah terkirim
     - 📝 **Delivery Notes**: Tambah bukti pengiriman/tanda terima

   **Workflow**:
   1. Lihat shipment dengan status "packed"
   2. Klik "Mulai Pengiriman" → status menjadi "shipped"
   3. Ketika sudah terkirim:
      - Tambah catatan pengiriman (bubblepack, foto, bukti tanda terima, dll)
      - Klik "Tandai Sudah Terkirim" → status menjadi "delivered"

---

## 🗄️ Database Schema

### Tables Created:

```
orders              → Penyimpanan sales order
invoices            → Penyimpanan invoice
shipments           → Tracking pengiriman
staging_products    → Staging area untuk upload produk
```

### Related Existing Tables:

```
outlets             → Data retail outlet
products            → Master produk
users               → User profiles dengan role
```

---

## 📊 Business Flow Diagram

```
┌─────────────┐
│  Marketing  │  Create Sales Order
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Order Created   │  Status: pending
│  (orders table)  │
└──────┬───────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────────┐           ┌──────────────────────┐
│ Fakturis/        │           │ Admin Logistik (IN)  │
│ Marketing        │           │ Manage Packing       │
│ Create Invoice   │           │ pending→packing      │
│ (invoices table) │           │ packing→packed       │
└──────┬───────────┘           └──────┬───────────────┘
       │                              │
       ▼                              ▼
┌──────────────────┐       ┌──────────────────────┐
│ Admin Keuangan   │       │ Admin Ekspedisi      │
│ Review Invoice   │       │ Monitor Delivery     │
│ posted→released  │       │ packed→shipped       │
└──────┬───────────┘       │ shipped→delivered    │
       │                   └──────┬───────────────┘
       └───────────________________┘
               │
               ▼
        ✓ Order Complete
```

---

## 🔐 Access Control (RLS)

| Role | Orders | Invoices | Shipments | Outlets |
|------|--------|----------|-----------|---------|
| Admin Keuangan | View | View/Release | View | Export |
| Marketing | Create/Edit Own | View | View | View |
| Fakturis | View | View | View | - |
| Admin Logistik | View | - | Update | - |
| Admin Ekspedisi | View | - | Update | - |
| Super Admin | All | All | All | All |

---

## 📝 Sample Data untuk Testing

### Create Test Accounts:

```
1. Admin Keuangan
   Email: keuangan@test.com
   Password: password123
   Role: admin_keuangan

2. Marketing
   Email: marketing@test.com
   Password: password123
   Role: marketing

3. Fakturis
   Email: fakturis@test.com
   Password: password123
   Role: fakturis

4. Logistik In
   Email: logistik-in@test.com
   Password: password123
   Role: admin_logistik

5. Logistik Out
   Email: logistik-out@test.com
   Password: password123
   Role: admin_ekspedisi
```

### Sample Products CSV Format:

```csv
id,name,price,stock,gol,komposisi
1,Product A,50000,100,F1,Komposisi A
2,Product B,75000,50,F2,Komposisi B
3,Product C,100000,25,F3,Komposisi C
```

---

## 🛠️ Customization & Extension

### Menambah Field Baru ke Order:

1. Edit SQL: `database/orders_invoices.sql`
2. Ubah `items JSONB` atau tambah kolom baru
3. Update `lib/orders.ts` interfaces
4. Update UI components sesuai kebutuhan

### Menambah Status Baru:

1. Update SQL CHECK constraint
2. Update status type di `lib/orders.ts`
3. Update UI components untuk handle status baru

### Menambah Role Baru:

1. Update SQL CHECK di `users` table
2. Update `UserRole` type di `lib/auth.ts`
3. Update `ROLES` array di `app/components/LoginPage.tsx`
4. Buat dashboard page baru di `app/[new-role]/page.tsx`
5. Update redirect logic di `app/dashboard/page.tsx`

---

## ⚠️ Troubleshooting

### Error: "Unauthorized: Insufficient permissions"
- Pastikan role user sudah benar di database
- Check RLS policies di Supabase dashboard

### Export CSV tidak bisa di-download
- Pastikan browser allow downloads
- Check browser console untuk error

### Redirect tidak bekerja setelah login
- Clear browser cache
- Pastikan user profile sudah tersimpan di `users` table
- Check role name di database

### Staging products tidak tersimpan
- Pastikan CSV format benar
- Check file encoding (UTF-8)
- Lihat error message di UI

---

## 📞 Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

Selamat! Sistem sudah lengkap dan siap digunakan! 🎉
