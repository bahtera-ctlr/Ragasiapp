# 🎯 Admin Management System - Super Admin Features

## Overview

Halaman **Admin Management** adalah dashboard khusus untuk **Super Admin** yang memungkinkan pengelolaan user sistem secara menyeluruh.

> **⚠️ PENTING**: Halaman ini HANYA bisa diakses oleh user dengan role `super_admin`. User lain akan otomatis diredirect ke `/dashboard`.

---

## 🔐 Security Features

### 1. Role-Based Access Control
- Middleware otomatis mengecek role user
- Jika bukan `super_admin`, user diredirect ke `/dashboard`
- Implementasi menggunakan `useRoleCheck` hook

### 2. Server-Side Actions
Semua operasi menggunakan **Next.js Server Actions** (`'use server'`) untuk keamanan maksimal:

```typescript
// app/admin-super/actions.ts
- createUserAction()      // Create new user
- getAllUsersAction()     // Get all users
- updateUserAction()      // Update user details
- deactivateUserAction()  // Deactivate user
- activateUserAction()    // Activate user
- deleteUserAction()      // Delete user
```

Keuntungan Server Actions:
✅ Database credentials aman (tidak expose ke client)
✅ Validasi input di server side
✅ Error handling yang baik
✅ RLS policies tetap berlaku

### 3. Supabase RLS Policies
Database-level security dengan RLS:

```sql
-- Super admin only dapat:
- SELECT: semua user
- UPDATE: profile user (name, role, is_active)
- DELETE: user dari sistem
```

---

## 📋 Fitur Utama

### 1️⃣ Tambah User Baru

**Form Fields:**
- **Nama** (Text) - Nama lengkap user
- **Email** (Email) - Email unik user
- **Password** (Text) - Min. 6 karakter
- **Role** (Dropdown) - Pilih role:
  - Admin Keuangan
  - Marketing
  - Fakturis
  - Admin Logistik
  - Admin Ekspedisi
  - Super Admin

**Validasi:**
```typescript
- Email harus unik (checked by Supabase)
- Password minimal 6 karakter
- Semua field wajib diisi
- Email format valid
```

**Process Flow:**
1. Form submit → Server Action `createUserAction()`
2. Create user di `auth.users` (Supabase Auth)
3. Insert profile ke `users` table dengan role
4. Auto-confirm email
5. Display success/error message
6. Refresh user list

### 2️⃣ Daftar User

**Tampilan Table:**
| Kolom | Deskripsi |
|-------|-----------|
| Nama | Nama lengkap user |
| Email | Email user |
| Role | Badge dengan warna sesuai role |
| Status | Aktif/Nonaktif (clickable button) |
| Dibuat | Tanggal user dibuat |
| Aksi | Edit / Hapus buttons |

**Search Functionality:**
- Search by name atau email
- Real-time filtering
- Case-insensitive

### 3️⃣ Edit User

**Modal Form:**
- Edit Nama
- Edit Role
- Update button untuk save perubahan

**Features:**
- Non-destructive update (hanya update field yang berubah)
- Real-time form validation
- Error display jika update gagal

### 4️⃣ Toggle Status User

**Aksi:**
- Click tombol Status (Aktif/Nonaktif)
- Instant update ke database
- UI refresh otomatis

**Use Cases:**
- Suspend user tanpa delete data
- Reactivate user yang di-suspend
- Lebih aman dari hard delete

### 5️⃣ Hapus User

**Delete Confirmation Modal:**
- Tampilkan nama dan email user
- Confirm dialog sebelum hapus
- Warning bahwa data akan terhapus permanent

**Process:**
1. Click Hapus button → Show confirmation
2. Confirm hapus → Execute `deleteUserAction()`
3. Delete dari `users` table
4. Delete dari `auth.users` (Supabase Auth)
5. Refresh user list

---

## 🎨 UI/UX Design

### Color Scheme
**Tailwind CSS Classes:**
```css
- Primary: bg-blue-600 (action buttons)
- Danger: bg-red-600 (delete button)
- Success: bg-green-100 text-green-800 (status badge)
- Warning: bg-red-100 text-red-800 (inactive status)
- Info: bg-gray-50 (table background)
```

### Role Badge Colors
```
admin_keuangan: bg-green-100 text-green-800
marketing:     bg-purple-100 text-purple-800
fakturis:      bg-blue-100 text-blue-800
admin_logistik: bg-orange-100 text-orange-800
admin_ekspedisi: bg-red-100 text-red-800
super_admin:    bg-yellow-100 text-yellow-800
```

### Layout
- **Header**: PageHeader dengan title "Admin Management"
- **Main Content**: Responsive grid layout
- **Forms**: 2-column grid (nama/email, password/role)
- **Table**: Full-width dengan horizontal scroll di mobile

---

## 🗄️ Database Changes

### New Column: `is_active`

**Migration File:**
`database/add-user-management-columns.sql`

**Changes:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Existing Columns:**
- `id` (UUID) - Primary key
- `email` (TEXT) - Unique
- `name` (TEXT)
- `role` (TEXT) - Check constraint
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `is_active` (BOOLEAN) - **NEW** - Default true

---

## 🚀 Setup Instructions

### 1. Run Database Migration

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Copy-paste content dari `database/add-user-management-columns.sql`
3. Click "Run"

**Via CLI:**
```bash
psql $DATABASE_URL < database/add-user-management-columns.sql
```

### 2. Access Admin Panel

1. Login dengan akun `super_admin`
2. Go to Dashboard
3. Click "Admin Management" panel
4. URL: `http://localhost:3000/admin-super`

### 3. Create First Super Admin (if needed)

```typescript
// Via Supabase Dashboard or CLI:
const result = await signUp({
  email: 'super@ragasi.local',
  password: 'AdminPassword123',
  name: 'Super Administrator',
  role: 'super_admin'
});
```

---

## 🧪 Testing Checklist

### Role Guard
- [ ] Non-super_admin user cannot access `/admin-super`
- [ ] Should redirect to `/dashboard` automatically
- [ ] Admin Super panel only shows for super_admin role

### User Creation
- [ ] Create user dengan semua field terisi
- [ ] Create user dengan invalid email → show error
- [ ] Create user dengan password < 6 karakter → show error
- [ ] Create user dengan duplicate email → show error
- [ ] New user bisa login dengan credentials yang baru

### User Management
- [ ] Edit user name & role works
- [ ] Toggle user status (aktif/nonaktif) works
- [ ] Delete user dengan confirmation works
- [ ] Search/filter user works

### UI/UX
- [ ] Form error messages display correctly
- [ ] Success messages display after action
- [ ] Loading states show during async operations
- [ ] Modals close after successful action
- [ ] Table responsive di mobile
- [ ] All buttons are clickable and functional

---

## 🔍 Troubleshooting

### Error: "User already exists"
**Cause:** Email sudah terdaftar di sistem
**Solution:** Gunakan email yang berbeda atau check existing users list

### Error: "Insufficient permissions"
**Cause:** User tidak memiliki role `super_admin`
**Solution:** Verify user role di database, atau re-login dengan akun super admin

### Error: "Failed to create user"
**Cause:** Database connection issue atau RLS policy error
**Solution:** Check Supabase dashboard logs, verify RLS policies applied

### User tidak bisa login setelah create
**Cause:** Email belum di-verify
**Solution:** `email_confirm: true` di `createUserAction()` sudah auto-confirm

---

## 📚 File Structure

```
app/admin-super/
├── page.tsx          # Main dashboard component (Client)
└── actions.ts        # Server Actions for security

database/
└── add-user-management-columns.sql  # Migration file

app/dashboard/page.tsx  # (Updated) Added Admin Management panel link
```

---

## 🔗 Related Documentation

- [AUTH_REFERENCE.md](../AUTH_REFERENCE.md) - Sistem autentikasi
- [database/users.sql](../database/users.sql) - Users table schema
- [lib/auth.ts](../lib/auth.ts) - Auth functions
- [lib/hooks.ts](../lib/hooks.ts) - React hooks (useAuth, useRoleCheck)

---

## ✅ Implementation Status

- ✅ Halaman Admin Super terpisah dari Admin Keuangan
- ✅ Role guard untuk super_admin only
- ✅ Fitur Create User dengan form validation
- ✅ Fitur Read Users dengan tabel dan search
- ✅ Fitur Edit User (name, role)
- ✅ Fitur Toggle Status (aktif/nonaktif)
- ✅ Fitur Delete User dengan confirmation
- ✅ Server Actions untuk security
- ✅ UI profesional dengan Tailwind CSS
- ✅ RLS policies untuk database security
- ✅ Error handling dan user feedback

---

**Last Updated:** May 2026
**Version:** 1.0
