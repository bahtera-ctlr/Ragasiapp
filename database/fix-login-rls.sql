-- ====== FIX LOGIN ISSUE - COMPREHENSIVE RLS POLICY FIX ======
-- Jalankan ini di Supabase SQL Editor

-- 1. Drop semua existing policies di users table
DROP POLICY IF EXISTS user_read_own_data ON users;
DROP POLICY IF EXISTS user_update_own_data ON users;
DROP POLICY IF EXISTS admin_create_users ON users;
DROP POLICY IF EXISTS users_create_own_profile ON users;

-- 2. Create policies yang benar untuk login flow

-- Policy 1: User bisa read own profile
CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: User bisa read all users (untuk checking existence maybe)
CREATE POLICY users_read_all ON users
  FOR SELECT
  USING (true);

-- Policy 3: User bisa create own profile (first login)
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (
    auth.uid() = id  -- User create dengan id = auth.uid()
  );

-- Policy 4: User bisa update own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 5: Super admin bisa do everything
CREATE POLICY users_admin_all ON users
  FOR ALL
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- 3. Verify policies
SELECT schemaname, tablename, policyname, qual, with_check FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;
