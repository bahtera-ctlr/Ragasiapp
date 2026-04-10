-- Fix RLS Policy untuk Users Table - Allow authenticated users to create their own profile
-- This fixes the login error where auto-profile-creation fails due to RLS policy

-- Drop the old restrictive policy
DROP POLICY IF EXISTS admin_create_users ON users;

-- Create new policy that allows:
-- 1. Users to create their own profile (id = auth.uid())
-- 2. Super admin to create any user
-- 3. Unauthenticated users (for signup flow)
CREATE POLICY admin_create_users ON users
  FOR INSERT
  WITH CHECK (
    auth.uid() = id  -- User can create their own profile
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'  -- Super admin can create any user
    OR auth.uid() IS NULL  -- Unauthenticated can insert (for signup)
  );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'admin_create_users';
