## 🔧 LOGIN ISSUE FIX - STEP BY STEP

### STEP 1: Fix RLS Policies
1. Go to Supabase Dashboard → SQL Editor
2. Copy-paste **semua** isi dari: `database/fix-login-rls.sql`
3. Click **RUN**
4. Wait sampai berhasil (check output di bawah)

### STEP 2: Test Login dengan Signup
1. Buka app di browser (jalankan `npm dev`)
2. Ke halaman LOGIN
3. Click tab **"SIGN UP"** (bukan Login)
4. Fill form dengan data:
   ```
   Email:    test@example.com
   Password: TestPassword123
   Name:     Test User
   Role:     Admin Keuangan (dropdown)
   ```
5. Click tombol **"DAFTAR"**
6. Expected: Success message "Akun berhasil dibuat"

### STEP 3: Verify di Supabase
1. Go to Supabase Dashboard
2. Go to: Authentication → Users
3. Cek apakah `test@example.com` ada di list

### STEP 4: Test Login
1. Di app, click tab **"LOGIN"**
2. Fill form:
   ```
   Email:    test@example.com
   Password: TestPassword123
   ```
3. Click **"LOG IN"**
4. Expected: Success message dan redirect ke dashboard sesuai role

### TROUBLESHOOTING

**Error: "new row violates row-level security policy"**
- ✅ Fixed by RLS policy drop + recreate

**Error: "Gagal mendapatkan profile user"**
- Bisa terjadi jika profile tidak auto-create
- Solution: Run step 1-3 dulu, baru step 4

**Error: "Invalid login credentials"**
- Email/password salah atau user belum dibuat
- Solution: Ulangi step 2 (signup dulu baru login)

### QUICK REFERENCE

**Signup Flow:**
```
LoginPage → SignUp Form → logIn() → getUser() → Check Profile
→ Jika tidak ada: Auto-Create Profile
→ Redirect ke role page
```

**Login Flow:**
```
LoginPage → Login Form → logIn() → getUser() → Get Profile
→ Redirect ke role page
```

### NEXT: Create More Test Users
Setelah test login berhasil:

1. Repeat Step 2 dengan email berbeda + role berbeda:
   - `marketing@test.com` → Marketing
   - `fakturis@test.com` → Fakturis
   - `logistik-in@test.com` → Admin Logistik
   - `logistik-out@test.com` → Admin Ekspedisi

2. Test setiap role bisa:
   - Login ✓
   - Access dashboard yang sesuai ✓
   - Access denied ke dashboard role lain ✓
