# Ringkasan Sistem Autentikasi

## Struktur File

```
ragasiapp/
├── lib/
│   ├── auth.ts                    # Fungsi autentikasi (login, signup, logout)
│   └── supabase.ts                # Supabase client config
├── app/
│   ├── page.tsx                   # Login page (home)
│   ├── components/
│   │   └── LoginPage.tsx           # Login/Signup component
│   ├── dashboard/
│   │   └── page.tsx                # Protected dashboard page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   └── sales/
│       └── page.tsx                # (existing)
├── database/
│   └── users.sql                   # Users table schema
├── .env.local                      # Supabase credentials
└── SETUP_AUTH.md                   # Setup instructions
```

## Role yang Tersedia

| Role | Deskripsi |
|------|-----------|
| `admin_keuangan` | Admin Keuangan |
| `marketing` | Marketing |
| `fakturis` | Fakturis (Billing) |
| `admin_logistik` | Admin Logistik |
| `admin_ekspedisi` | Admin Ekspedisi |
| `super_admin` | Super Admin (Full Access) |

## Alur Autentikasi

### Sign Up Flow:
```
User Input Form (email, password, name, role)
    ↓
signUp() function
    ↓
Buat user di Supabase Auth
    ↓
Simpan profile di "users" table
    ↓
Kirim verification email
    ↓
Success message
```

### Login Flow:
```
User Input (email, password)
    ↓
logIn() function
    ↓
Verify dengan Supabase Auth
    ↓
Generate session token
    ↓
Redirect ke /dashboard
```

### Dashboard Access:
```
User visit /dashboard
    ↓
Check session dengan getCurrentUser()
    ↓
Jika ada session: Tampilkan dashboard
Jika tidak: Redirect ke /
```

## Database Schema

### users table:
- `id` (UUID) - User ID dari auth
- `email` (TEXT) - Email unik
- `name` (TEXT) - Nama user
- `role` (TEXT) - Salah satu dari 6 roles
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Functions

### lib/auth.ts

#### signUp(input: CreateUserInput)
```typescript
interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

const result = await signUp({
  email: 'admin@example.com',
  password: 'password123',
  name: 'Admin Keuangan',
  role: 'admin_keuangan'
});

if (result.error) {
  console.error(result.error);
} else {
  console.log('Account created');
}
```

#### logIn(input: LoginInput)
```typescript
interface LoginInput {
  email: string;
  password: string;
}

const result = await logIn({
  email: 'admin@example.com',
  password: 'password123'
});

if (result.error) {
  console.error(result.error);
} else {
  console.log('Logged in');
}
```

#### logOut()
```typescript
const result = await logOut();
if (result.error) {
  console.error(result.error);
}
```

#### getCurrentUser()
```typescript
const { data: user, error } = await getCurrentUser();
if (user) {
  console.log(user.email);
}
```

#### getUserProfile(userId: string)
```typescript
const { data: profile, error } = await getUserProfile(userId);
if (profile) {
  console.log(profile.role);
}
```

## Security Features

✅ Password hashing by Supabase Auth
✅ Email verification required
✅ RLS (Row Level Security) di database
✅ Users hanya akses data mereka sendiri
✅ Super Admin bisa manage semua users
✅ Protected routes (dashboard hanya bisa diakses yang login)
✅ Session management built-in

## Testing Account Example

Anda bisa membuat beberapa akun test dengan role berbeda:

```
1. Finance Admin
   Email: finance@example.com
   Password: password123
   Role: admin_keuangan

2. Marketing
   Email: marketing@example.com
   Password: password123
   Role: marketing

3. Billing
   Email: billing@example.com
   Password: password123
   Role: fakturis

4. Logistics
   Email: logistics@example.com
   Password: password123
   Role: admin_logistik

5. Expedition
   Email: expedition@example.com
   Password: password123
   Role: admin_ekspedisi

6. Super Admin
   Email: superadmin@example.com
   Password: password123
   Role: super_admin
```

## Next Steps

1. ✅ Setup database schema dengan menjalankan SQL di Supabase
2. ⏭ Buat halaman role-based untuk setiap fungsi
3. ⏭ Tambah authorized routes/middleware untuk setiap role
4. ⏭ Integrate dengan page produk yang sudah ada
5. ⏭ Tambah audit logging untuk tracking aktivitas

---

Selamat menggunakan sistem autentikasi! 🚀
