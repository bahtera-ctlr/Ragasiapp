-- ====== TEST USER CREATION ======
-- Jalankan ini di Supabase SQL Editor untuk membuat test user

-- Method 1: Insert langsung ke auth.users (via Supabase Admin API)
-- Tapi ini tidak bisa via SQL Editor

-- Method 2: Buat user via signup di app langsung
-- Step-by-step:
-- 1. Buka app di browser (npm dev)
-- 2. Ke halaman LOGIN
-- 3. Click tab "SIGN UP"
-- 4. Fill form:
--    - Email: test@example.com
--    - Password: TestPassword123
--    - Name: Test User
--    - Role: admin_keuangan
-- 5. Click "DAFTAR"
-- 6. Verify email di Supabase (atau skip biar auto-verified)

-- Setelah user created, verify di Supabase:
SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5;
