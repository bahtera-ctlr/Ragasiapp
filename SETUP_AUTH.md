# Panduan Setup Autentikasi

## 1. Setup Database di Supabase

Jalankan SQL query di bawah ini di Supabase SQL Editor untuk membuat tabel `users`:

```sql
-- File: database/users.sql
```

Atau copy-paste isi dari file `database/users.sql` ke Supabase SQL Editor dan jalankan.

### Steps:
1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Masuk ke project Anda
3. Buka **SQL Editor** di sidebar kiri
4. Klik **+ New Query**
5. Copy-paste seluruh SQL dari `database/users.sql`
6. Klik **Run**

---

## 2. Fitur yang Tersedia

### Halaman Login/Signup
- **URL**: `http://localhost:3000/`
- **Fitur**:
  - Tab Login: Masuk dengan email dan password
  - Tab Signup: Buat akun baru dengan memilih role

### Role yang Tersedia:
1. **Admin Keuangan** - Kelola keuangan dan accounting
2. **Marketing** - Kelola marketing dan promosi
3. **Fakturis** - Kelola invoicing dan billing  
4. **Admin Logistik** - Kelola logistik dan warehouse
5. **Admin Ekspedisi** - Kelola pengiriman dan ekspedisi
6. **Super Admin** - Akses penuh sistem

### Dashboard
- **URL**: `http://localhost:3000/dashboard` (hanya bisa diakses setelah login)
- **Fitur**:
  - Menampilkan informasi user yang login
  - Menampilkan role user dengan color badge
  - Button logout
  - Placeholder untuk stats dan features

---

## 3. Cara Menggunakan

### Login:
1. Buka `http://localhost:3000`
2. Klik tab **Login**
3. Masukkan email dan password
4. Klik tombol **Login**

### Signup/Buat Akun Baru:
1. Buka `http://localhost:3000`
2. Klik tab **Signup**
3. Isi form:
   - Nama
   - Email
   - Password (min 6 karakter)
   - Pilih Role
4. Klik tombol **Buat Akun**
5. Check email untuk verifikasi (Supabase akan mengirim email)

---

## 4. File-file yang Dibuat

- `lib/auth.ts` - Fungsi autentikasi (login, signup, logout, etc)
- `app/components/LoginPage.tsx` - Component login/signup page
- `app/dashboard/page.tsx` - Dashboard page (protected route)
- `database/users.sql` - SQL schema untuk users table

---

## 5. Environment Variables

Pastikan `.env.local` sudah ada dengan:
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

---

## 6. Testing

### Buat Akun Test:
```
Email: admin@example.com
Password: password123
Nama: Admin Keuangan
Role: Admin Keuangan
```

Akun ini akan disimpan di Supabase dan bisa digunakan untuk login.

---

## 7. Keamanan

- **RLS (Row Level Security)** sudah diaktifkan di Supabase
- Users hanya bisa lihat/edit data mereka sendiri
- Super Admin bisa manage semua users
- Password harus minimal 6 karakter

---

## 8. Customization

### Tambah Role Baru:

1. Edit `lib/auth.ts` - update `UserRole` type
2. Update SQL di `database/users.sql` - update CHECK constraint
3. Edit `app/components/LoginPage.tsx` - update `ROLES` array
4. Update `app/dashboard/page.tsx` - update `getRoleLabel` dan `getRoleBadgeColor`

### Ubah Styling:

Semua component menggunakan Tailwind CSS. Ubah class nama untuk style yang berbeda.

---

## Troubleshooting

### Error: User already exists
- Email sudah terdaftar, gunakan email yang berbeda

### Error: Invalid email
- Format email tidak valid, gunakan format correct

### Tidak bisa login setelah signup
- Pastikan email sudah di-verify di email yang terdaftar
- Check Supabase dashboard untuk status user

### Session expired
- Keluar dan login ulang

---

Selamat! Sistem autentikasi sudah siap digunakan! 🎉
