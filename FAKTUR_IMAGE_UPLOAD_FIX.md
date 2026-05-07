# Fix: Faktur Images Upload Not Working (400 Bad Request)

## Problem
Ketika mencoba upload gambar / paste tangkapan layar di halaman Fakturis, muncul error **400 (Bad Request)** pada console:

```
POST https://dnbxgxctcrtpjcnkpatp.supabase.co/storage/v1/object/faktur-images/... 400 (Bad Request)
```

## Penyebab
Storage bucket `faktur-images` tidak memiliki **RLS (Row Level Security) policies** yang tepat pada tabel `storage.objects`. Tanpa policies ini, user tidak bisa upload file ke bucket tersebut.

## Solusi

### Step 1: Setup Storage Policies via Dashboard UI

Storage policies di Supabase harus dibuat melalui **Dashboard UI**, bukan SQL (tabel `storage.objects` adalah system table yang tidak bisa dimodifikasi via SQL).

#### Cara setup:

1. **Buka Supabase Dashboard** → pilih project Anda
2. Pergi ke **Storage** (di sidebar)
3. Klik **Buckets** 
4. Cari dan klik bucket **`faktur-images`**
5. Pilih tab **Policies**
6. Klik **"New Policy"** atau **"Create Policy"** (tampilan bisa beda per versi)

#### Buat 3 Policies berikut:

**Policy 1: Allow Users to Upload (INSERT)**
1. Click **"New Policy"**
2. Di template list, pilih: **"Give users access to a folder only to authenticated users"**
3. Tampilannya akan muncul form untuk configure:
   - Policy name: `Allow authenticated to upload faktur images`
   - Allowed operation: **INSERT**
   - For: **authenticated**
   - With check: `bucket_id = 'faktur-images'`
4. Click **"Create Policy"** / **"Review"** → **"Create"**

**Policy 2: Allow Public to View (SELECT)**
1. Click **"New Policy"** lagi
2. Di template list, pilih: **"Allow access to JPG images in a public folder to anonymous users"**
3. Configure form:
   - Policy name: `Allow public to view faktur images`
   - Allowed operation: **SELECT**
   - For: **public**
   - Using: `bucket_id = 'faktur-images'`
   - (Catatan: template ini default JPG, tapi akan diabaikan karena setting di bucket level)
4. Click **"Create Policy"** / **"Review"** → **"Create"**

**Policy 3: Allow Users to Delete Own Files (DELETE)**
1. Click **"New Policy"** lagi
2. Di template list, pilih: **"Give users access to only their own top level folder named as uid"**
3. Configure form:
   - Policy name: `Allow users to delete own faktur images`
   - Allowed operation: **DELETE**
   - For: **authenticated**
   - Using: `bucket_id = 'faktur-images' AND owner_id = auth.uid()`
4. Click **"Create Policy"** / **"Review"** → **"Create"**

**Ringkas:**
- Policy 1 (INSERT): Template "Give users access to a folder only to authenticated users"
- Policy 2 (SELECT): Template "Allow access to JPG images in a public folder to anonymous users"
- Policy 3 (DELETE): Template "Give users access to only their own top level folder named as uid"

**Screenshot guide:**
```
Supabase Dashboard
└── Storage
    └── Buckets
        └── faktur-images
            └── Policies (tab)
                ├── New Policy button
                ├── INSERT policy ✓
                ├── SELECT policy ✓
                └── DELETE policy ✓
```

### Step 2: Pastikan Bucket Konfigurasi Benar

1. Di Supabase Dashboard, pergi ke **Storage** → **Buckets**
2. Cari bucket bernama **`faktur-images`**
3. Pastikan:
   - ✅ Bucket sudah ada dengan nama exact: `faktur-images`
   - ✅ Set ke **Public** (untuk akses baca publik)
   - ✅ Tidak ada masalah permissions

Jika bucket belum ada, buat baru:
- Klik **"+ New Bucket"**
- Name: `faktur-images`
- Privacy: **Public**
- Klik **"Create bucket"**

### Step 3: Test Upload

1. Login ke aplikasi dengan user role `fakturis` atau `super_admin`
2. Buka halaman **Fakturis Dashboard**
3. Pilih salah satu invoice yang belum difakturkan
4. Coba upload gambar dengan cara:
   - ✅ Klik zona upload
   - ✅ Drag-drop gambar
   - ✅ Paste screenshot (Cmd+V)

## Apa yang di-setup

Ketiga policies berikut akan disetup via Dashboard UI:

| Policy | Action | Who | Effect |
|--------|--------|-----|--------|
| Upload policy | INSERT | Authenticated users | Bisa upload file ke bucket `faktur-images` |
| View policy | SELECT | Public | Siapa saja bisa lihat gambar (tanpa login) |
| Delete policy | DELETE | Authenticated users | Hanya user yang upload bisa hapus file mereka |

**Note:** Storage policies di Supabase harus dibuat melalui Dashboard UI, bukan SQL direct.

## Troubleshooting

### Error: "bucket not found"
- ✅ Pastikan bucket `faktur-images` sudah dibuat di Storage
- ✅ Nama harus exact (case-sensitive)

### Error: "403 Forbidden" setelah run SQL
- Mungkin user tidak authenticated dengan benar
- Cek apakah ada issue dengan session/login

### Upload masih error setelah SQL
- Coba refresh halaman aplikasi (Cmd+R)
- Clear browser cache jika perlu
- Pastikan sudah login dengan user yang tepat

## Tambahan Info

### File yang terlibat:
- **Upload function**: `lib/faktur-images.ts` (line 53)
- **UI Component**: `app/fakturis/page.tsx` (line 183)
- **Database table**: `faktur_images` (untuk menyimpan referensi gambar)
- **Storage bucket**: `faktur-images` (untuk menyimpan file gambar)

### Validasi File Upload:
- **Tipe**: JPEG, PNG, WebP, GIF
- **Ukuran max**: 5MB per file
- **Path format**: `{invoiceId}/{timestamp}-{random}.{ext}`

---

**Jika masih ada error, cek:**
1. Browser developer console (F12) untuk error detail
2. Supabase logs di dashboard
3. Pastikan RLS policies sudah active
