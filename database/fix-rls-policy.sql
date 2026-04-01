-- ====== FIX RLS POLICY - Izinkan user create own profile ======
-- Jalankan ini di Supabase SQL Editor untuk fix RLS error

-- Drop policy yang lama
DROP POLICY IF EXISTS admin_create_users ON users;

-- Create policy baru yang lebih fleksibel
CREATE POLICY users_create_own_profile ON users
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NULL) OR  -- Allow service role / anon
    (auth.uid() = id) OR     -- Allow user to create their own profile
    ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin')  -- Allow super_admin
  );

-- Verifikasi policy
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users';
