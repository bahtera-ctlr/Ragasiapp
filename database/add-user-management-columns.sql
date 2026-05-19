-- Add is_active column to users table for user status management
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index untuk is_active untuk query performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Update existing users to ensure they have is_active set to true
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_read_own_data" ON users;
DROP POLICY IF EXISTS "user_read_all_for_super_admin" ON users;
DROP POLICY IF EXISTS "user_update_own_data" ON users;
DROP POLICY IF EXISTS "admin_create_users" ON users;
DROP POLICY IF EXISTS "super_admin_update_users" ON users;
DROP POLICY IF EXISTS "super_admin_delete_users" ON users;

-- ====== RLS POLICIES (FIXED - NO INFINITE RECURSION) ======

-- 1. SELECT: Users can read their own data
CREATE POLICY "user_read_own_data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- 2. SELECT: Super admin can read all users
-- Using auth.jwt() to avoid infinite recursion
CREATE POLICY "super_admin_read_all" ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR (auth.jwt() ->> 'role') = 'super_admin'
  );

-- 3. UPDATE: Users can update their own data
CREATE POLICY "user_update_own_data" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. UPDATE: Super admin can update any user
CREATE POLICY "super_admin_update_users" ON users
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'super_admin');

-- 5. INSERT: Allow during signup and super_admin can create users
CREATE POLICY "user_insert_own_profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "super_admin_insert_users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'super_admin');

-- 6. DELETE: Super admin can delete users
CREATE POLICY "super_admin_delete_users" ON users
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'super_admin');
