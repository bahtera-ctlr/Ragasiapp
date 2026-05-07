# Panduan Setup - Fitur Upload Gambar Fakturis

## Deskripsi Fitur
Fitur ini memungkinkan petugas fakturis untuk upload gambar ketika mereka selesai memfakturkan. Gambar dapat diunggah dari:
- File di komputer (klik atau drag-drop)
- Copy-paste tangkapan layar langsung
- Multiple gambar sekaligus

## Setup Steps

### 1. Jalankan Database Migration

Buka Supabase Dashboard dan jalankan SQL dari file berikut:
```
database/create-faktur-images-table.sql
```

Atau klik: [SQL Editor] → [New Query] dan salin seluruh isi file tersebut, lalu [Run].

**Yang akan dibuat:**
- Tabel `faktur_images` untuk menyimpan referensi gambar
- Index untuk query yang lebih cepat
- RLS (Row Level Security) policies untuk keamanan data

### 2. Setup Storage Bucket di Supabase

1. Buka Supabase Dashboard
2. Pergi ke: **Storage** → **Buckets**
3. Klik **+ New Bucket**
4. Isi informasi:
   - **Name**: `faktur-images`
   - **Privacy**: `Public` (agar gambar bisa diakses)
5. Klik **Create bucket**

### 3. Configure Storage Policies (Optional tapi Recommended)

1. Di bucket `faktur-images`, pilih **Policies**
2. Tambahkan policy untuk upload:
   - **Allow authenticated users to upload images**
   - Gunakan statement: `auth.role() = 'authenticated'`
3. Tambahkan policy untuk read:
   - **Allow public read access**
   - Gunakan statement: `true` (atau biarkan default public)

### 4. Testing

1. Login ke aplikasi dengan user yang memiliki role `fakturis` atau `super_admin`
2. Buka halaman **Fakturis Dashboard**
3. Klik salah satu invoice yang belum difakturkan
4. Di modal, scroll ke bagian **Upload Gambar Faktur**
5. Coba upload gambar dengan salah satu cara:
   - Klik zona upload
   - Drag-drop gambar
   - Paste screenshot (Ctrl+V / Cmd+V)

## Fitur-Fitur

### Upload Gambar
- **Tipe file**: JPEG, PNG, WebP, GIF
- **Ukuran maksimal**: 5MB per file
- **Jumlah**: Unlimited (bisa upload berkali-kali)

### Tampilan Gambar
- Gambar ditampilkan dalam grid 2 kolom
- Hover di atas gambar untuk melihat tombol hapus

### Hapus Gambar
- Klik tombol hapus (🗑️) saat hover
- Gambar akan dihapus dari storage dan database
- Konfirmasi akan diminta

## Troubleshooting

### Storage Bucket Tidak Ditemukan
**Error**: "Bucket not found"
- Pastikan bucket `faktur-images` sudah dibuat di Supabase Storage
- Check nama bucket harus exact: `faktur-images`

### Upload Gagal dengan Error "Unauthorized"
**Penyebab**: RLS policies tidak sesuai
- Cek apakah user punya role `fakturis` atau `super_admin` di tabel `user_roles`
- Pastikan policies di table `faktur_images` sudah aktif

### Gambar Tidak Bisa Diload
**Penyebab**: Storage bucket privacy setting salah
- Pastikan bucket `faktur-images` set ke **Public**
- Jika ingin lebih secure, configure policies dengan benar

### File Terlalu Besar
**Error**: "Ukuran file terlalu besar. Maksimal 5MB"
- Kompres gambar sebelum upload
- Gunakan tool seperti: TinyPNG, ImageOptim, atau compression di OS

## Database Schema

```sql
-- Tabel faktur_images
Table: faktur_images
Columns:
- id (UUID): Primary Key
- invoice_id (UUID): Reference ke invoices table
- image_path (TEXT): Path file di storage
- uploaded_by (UUID): Reference ke auth.users
- uploaded_at (TIMESTAMP): Waktu upload
- created_at (TIMESTAMP): Waktu record dibuat
```

## File-File yang Diubah/Ditambah

### Ditambah:
- `lib/faktur-images.ts` - Library untuk handle image upload/delete
- `database/create-faktur-images-table.sql` - Database migration
- `FAKTURIS_IMAGE_UPLOAD_SETUP.md` - Dokumentasi ini

### Diubah:
- `app/fakturis/page.tsx` - Tambah UI dan logic untuk image upload

## API Functions (di lib/faktur-images.ts)

```typescript
// Upload satu gambar
uploadFakturImage(file: File, invoiceId: string, userId: string)

// Upload multiple gambar sekaligus
uploadMultipleFakturImages(files: File[], invoiceId: string, userId: string)

// Ambil semua gambar untuk satu invoice
getFakturImages(invoiceId: string)

// Hapus satu gambar
deleteFakturImage(imageId: string, imagePath: string)
```

## Storage URL Format

Gambar akan tersimpan di path:
```
faktur-images/{invoiceId}/{timestamp}-{random}.{ext}

Contoh:
faktur-images/12345678-abcd-1234-efgh-ijklmnopqrst/1704067200000-abc123.jpg
```

Public URL akan berbentuk:
```
https://{project}.supabase.co/storage/v1/object/public/faktur-images/{invoiceId}/{filename}
```

## Security Considerations

1. **RLS Enabled**: Tabel `faktur_images` menggunakan RLS untuk keamanan
2. **File Validation**: Hanya accept image files dan max 5MB
3. **User Attribution**: Setiap upload di-track dengan user_id
4. **Storage Isolation**: Gambar disimpan per invoice dalam folder terpisah

## Performance Tips

1. **Compress Images**: Request user untuk compress sebelum upload
2. **Batch Upload**: Fitur sudah support multiple upload sekaligus
3. **Caching**: Browser akan cache gambar public untuk kecepatan

## Future Enhancements

Bisa ditambahkan di masa depan:
- Preview gambar sebelum submit
- Crop/edit gambar
- Watermark otomatis
- Archive gambar lama
- Export gambar dengan invoices
