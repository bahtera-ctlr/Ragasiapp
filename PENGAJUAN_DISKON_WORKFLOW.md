# Workflow Pengajuan Diskon - Marketing & Super Admin

## 📋 Ringkasan Implementasi

Saya telah membuat workflow lengkap untuk pengajuan diskon antara Marketing dan Super Admin. Berikut adalah fitur-fitur yang telah diimplementasikan:

### 1. Marketing - Tab Pengajuan Diskon

**File:** `app/marketing/page.tsx`

#### Fitur:
- ✅ **Lihat Daftar Pengajuan**: Marketing dapat melihat semua pengajuan diskon yang pernah dibuat
- ✅ **Status Real-time**: Setiap pengajuan menampilkan status (Pending, Disetujui, atau Ditolak)
- ✅ **Feedback dari Super Admin**: Ketika pengajuan disetujui/ditolak, marketing bisa melihat catatan dari super admin
- ✅ **Ajukan Pengajuan Baru**: Tombol untuk membuat pengajuan diskon baru dengan form lengkap
- ✅ **Auto Refresh**: List otomatis ter-refresh setelah pengajuan baru dibuat

#### Status Requests:
- 🟡 **Pending** (Kuning) - Menunggu persetujuan dari super admin
- 🟢 **Disetujui** (Hijau) - Pengajuan telah disetujui dengan catatan
- 🔴 **Ditolak** (Merah) - Pengajuan ditolak dengan alasan

#### Form Pengajuan Diskon:
- Pilih Outlet
- Pilih Produk
- Masukkan Persentase Diskon (%)
- Alasan Diskon
- Periode Berlaku (Tanggal Mulai - Tanggal Selesai)

---

### 2. Super Admin - Tab Pengajuan Diskon (BARU)

**File:** `app/admin-super/page.tsx`

#### Fitur:
- ✅ **Menu Baru**: Tab "💰 Pengajuan Diskon" di halaman super admin
- ✅ **Lihat Semua Pengajuan**: Super admin dapat melihat SEMUA pengajuan diskon dari semua marketing
- ✅ **Filter Status**: Pengajuan terlihat dengan status visual (Pending, Disetujui, Ditolak)
- ✅ **Detail Lengkap**:
  - Produk yang diminta diskonnya
  - Outlet target
  - Persentase diskon
  - Periode berlaku
  - Alasan pengajuan
  - Siapa yang mengajukan (nama & email marketing)
- ✅ **Accept/Reject dengan Notes**: 
  - Tombol "Setujui" dan "Tolak" untuk pengajuan yang masih pending
  - Modal dialog untuk input catatan
  - Alasan penolakan wajib diisi
- ✅ **Auto Refresh**: List otomatis ter-refresh setelah approve/reject

#### Alur Approval:
1. Super admin melihat pengajuan yang masih `pending`
2. Klik tombol **"Setujui"** atau **"Tolak"**
3. Akan muncul modal dialog untuk input catatan
4. Klik konfirmasi
5. System akan:
   - Update status di database
   - Simpan catatan approval/rejection
   - Refresh list di super admin
   - **Marketing akan langsung melihat update** di tab pengajuan diskon mereka

---

## 🔄 Alur Data Lengkap

```
┌─────────────────────────────────────────────────────────────┐
│ MARKETING SIDE                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Marketing membuka tab "Pengajuan Diskon"                 │
│    └─> fetchDiscountRequests() dipanggil                    │
│        └─> getDiscountRequests() dari lib                   │
│            └─> Query: SELECT * FROM discount_requests       │
│                WHERE marketing_id = current_user            │
│                ORDER BY created_at DESC                     │
│                                                              │
│ 2. List ditampilkan dengan status dari database             │
│    ├─ Pending (Kuning)                                      │
│    ├─ Approved + Catatan (Hijau)                            │
│    └─ Rejected + Alasan (Merah)                             │
│                                                              │
│ 3. Marketing klik "Ajukan Diskon Baru"                      │
│    └─> Form modal muncul                                    │
│    └─> Fill form dan submit                                 │
│    └─> createDiscountRequest() dipanggil                    │
│        └─> INSERT INTO discount_requests                    │
│            (marketing_id, outlet_id, product_id, ...)       │
│            VALUES (...)                                     │
│    └─> fetchDiscountRequests() dipanggil untuk refresh      │
│    └─> List ter-update dengan pengajuan baru               │
│        (status = pending)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                        DATABASE
                    (discount_requests)
             (Shared between Marketing & Super Admin)
                    
┌─────────────────────────────────────────────────────────────┐
│ SUPER ADMIN SIDE                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Super Admin membuka tab "Pengajuan Diskon"               │
│    └─> fetchDiscountRequests() dipanggil                    │
│    └─> getAllDiscountRequests() dari lib                    │
│        └─> Query: SELECT * FROM discount_requests           │
│            JOIN outlets, products, users                    │
│            ORDER BY created_at DESC                         │
│                                                              │
│ 2. List ditampilkan dengan semua pengajuan                  │
│    ├─ Terlihat produk, outlet, persentase, alasan           │
│    ├─ Terlihat siapa yang mengajukan                        │
│    └─ Hanya pengajuan PENDING yang punya tombol action      │
│                                                              │
│ 3. Super Admin klik "Setujui" atau "Tolak"                  │
│    └─> Modal dialog muncul                                  │
│    └─> Input catatan:                                       │
│        ├─ Untuk "Setujui": Catatan persetujuan (optional)   │
│        └─ Untuk "Tolak": Alasan penolakan (wajib)           │
│    └─> Klik tombol konfirmasi                               │
│    └─> APPROVE: approveDiscountRequest() dipanggil          │
│        └─> UPDATE discount_requests SET                     │
│            status = 'approved',                             │
│            approved_by = super_admin_id,                    │
│            approval_notes = '...',                          │
│            approved_at = now()                              │
│            WHERE id = request_id                            │
│    └─> REJECT: rejectDiscountRequest() dipanggil            │
│        └─> UPDATE discount_requests SET                     │
│            status = 'rejected',                             │
│            approved_by = super_admin_id,                    │
│            approval_notes = '...',  (alasan penolakan)      │
│            approved_at = now()                              │
│            WHERE id = request_id                            │
│    └─> fetchDiscountRequests() dipanggil untuk refresh      │
│    └─> List ter-update, tombol hilang dari request tersebut │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                        DATABASE UPDATE
        (status berubah dari 'pending' ke 'approved'/'rejected')

                    REAL-TIME FEEDBACK
        (Marketing akan melihat update otomatis)

        Ketika Marketing merefresh atau kembali ke tab
        Pengajuan Diskon, mereka akan melihat:
        - Status yang ter-update (Disetujui/Ditolak)
        - Catatan dari Super Admin (Catatan/Alasan)
        - Tanggal approval
```

---

## 📝 Database Schema

Table yang digunakan: `discount_requests`

```sql
CREATE TABLE discount_requests (
  id UUID PRIMARY KEY,
  marketing_id UUID NOT NULL,  -- User ID dari Marketing
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  discount_percentage NUMERIC NOT NULL,  -- 5, 10, 15, etc.
  reason TEXT NOT NULL,  -- Alasan pengajuan
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  approval_notes TEXT,  -- Catatan approve atau alasan reject
  approved_by UUID,  -- ID dari Super Admin yang approve/reject
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## 🔧 Fungsi Library yang Digunakan

**File:** `lib/discount-requests.ts`

### 1. Marketing Side:
- `createDiscountRequest()` - Membuat pengajuan baru
- `getDiscountRequests()` - Ambil pengajuan user saat ini (hanya milik mereka)

### 2. Super Admin Side:
- `getAllDiscountRequests()` - Ambil semua pengajuan dari semua marketing
- `approveDiscountRequest()` - Approve pengajuan dengan catatan
- `rejectDiscountRequest()` - Reject pengajuan dengan alasan

---

## 🎨 UI Components

### Marketing Page Pengajuan Diskon
- **Header** dengan judul dan tombol "Ajukan Diskon Baru"
- **Loading State** saat mengambil data
- **Empty State** ketika belum ada pengajuan
- **List Items** dengan card layout untuk setiap pengajuan:
  - Nama produk + outlet
  - Persentase diskon
  - Periode berlaku
  - Status badge (color-coded)
  - Catatan/Alasan (jika ada)

### Super Admin Page Pengajuan Diskon (BARU)
- **Header** dengan judul
- **Filter/Search** (optional untuk pengembangan)
- **Loading State** saat mengambil data
- **Empty State** ketika belum ada pengajuan
- **List Items** dengan informasi detail:
  - Produk + Outlet
  - % Diskon + Periode
  - Diajukan oleh (Nama & Email)
  - Status badge
  - Tombol Setujui/Tolak (hanya untuk pending)
- **Approval Modal** untuk input catatan

---

## ✅ Testing Checklist

Untuk mengetes workflow ini:

### Test 1: Marketing Membuat Pengajuan
- [ ] Login sebagai Marketing
- [ ] Buka tab "Pengajuan Diskon"
- [ ] Lihat daftar (awalnya kosong)
- [ ] Klik "Ajukan Diskon Baru"
- [ ] Fill form dengan data:
  - Outlet: Pilih salah satu
  - Produk: Pilih salah satu
  - Diskon: 10
  - Alasan: "Test pengajuan"
  - Periode: Tanggal mulai - tanggal akhir
- [ ] Klik "Ajukan"
- [ ] Lihat alert sukses
- [ ] List ter-update menampilkan pengajuan baru dengan status "⏳ Menunggu"

### Test 2: Super Admin Melihat Pengajuan
- [ ] Login sebagai Super Admin
- [ ] Buka tab "💰 Pengajuan Diskon" (baru)
- [ ] Lihat pengajuan dari marketing yang tadi
- [ ] Verifikasi informasi terlihat dengan lengkap:
  - Produk
  - Outlet
  - Persentase diskon
  - Periode
  - Alasan
  - Nama & email marketing yang mengajukan

### Test 3: Super Admin Approve Pengajuan
- [ ] Klik tombol "Setujui"
- [ ] Modal dialog muncul
- [ ] Input catatan (optional): "Diskon disetujui untuk meningkatkan penjualan"
- [ ] Klik "Setujui" di modal
- [ ] Lihat loading state
- [ ] Alert sukses muncul
- [ ] List ter-refresh, pengajuan sekarang status "✓ Disetujui"
- [ ] Tombol hilang dari pengajuan tersebut

### Test 4: Marketing Melihat Feedback Approval
- [ ] Login sebagai Marketing
- [ ] Buka tab "Pengajuan Diskon"
- [ ] Lihat pengajuan yang tadi di-approve
- [ ] Status berubah menjadi "✓ Disetujui" (warna hijau)
- [ ] Lihat catatan dari super admin: "Diskon disetujui untuk meningkatkan penjualan"

### Test 5: Super Admin Reject Pengajuan
- [ ] Buat pengajuan baru dari marketing (repeat Test 1)
- [ ] Super Admin klik "Tolak"
- [ ] Modal dialog muncul
- [ ] Input alasan: "Persentase diskon terlalu tinggi"
- [ ] Klik "Tolak" di modal
- [ ] Alert sukses
- [ ] List ter-refresh, status "✗ Ditolak"

### Test 6: Marketing Melihat Feedback Rejection
- [ ] Login sebagai Marketing
- [ ] Buka tab "Pengajuan Diskon"
- [ ] Lihat pengajuan yang ditolak
- [ ] Status "✗ Ditolak" (warna merah)
- [ ] Lihat alasan: "Persentase diskon terlalu tinggi"

---

## 🔐 Security & Permissions

- ✅ Marketing hanya bisa melihat pengajuan milik mereka sendiri
- ✅ Super Admin bisa melihat SEMUA pengajuan dari semua marketing
- ✅ Hanya Super Admin yang bisa approve/reject
- ✅ User authentication sudah ada di setiap function

---

## 📊 Data Flow Summary

```
INPUT (Marketing)
    ↓
createDiscountRequest()
    ↓
INSERT INTO discount_requests
(status='pending')
    ↓
DISPLAY (Marketing sees list with "pending" status)
    ↓
getAllDiscountRequests() (Super Admin)
    ↓
DISPLAY (Super Admin sees all pending requests)
    ↓
approveDiscountRequest() OR rejectDiscountRequest()
    ↓
UPDATE discount_requests
(status='approved'/'rejected', approval_notes, approved_at)
    ↓
DISPLAY (Super Admin sees updated status, no action buttons)
    ↓
DISPLAY (Marketing sees updated status + notes/reason)
```

---

## 🚀 Next Steps (Optional)

Fitur tambahan yang bisa dikembangkan:
1. Email notification ketika pengajuan di-approve/reject
2. Admin dashboard untuk analytics pengajuan diskon
3. Filter/search di super admin untuk mencari pengajuan
4. Batch approval untuk multiple requests
5. History/archive tab untuk pengajuan lama
6. Export to CSV untuk reporting

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Check browser console untuk error messages
2. Verify database permissions untuk role super_admin
3. Ensure discount_requests table exists dengan schema yang benar
4. Test dengan different user roles

---

**Implementation Date:** May 23, 2026
**Status:** ✅ Complete dan Ready for Testing
