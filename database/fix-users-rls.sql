-- Fix RLS policies for users table
-- Allow all authenticated users to read their own profile
DROP POLICY IF EXISTS "Enable read access for own user profile" ON users;

CREATE POLICY "Enable read access for own user profile"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Allow authenticated users to read other users (for admin purposes)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON users;

CREATE POLICY "Enable read access for all authenticated users"
ON users
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow system to insert users during signup
DROP POLICY IF EXISTS "Enable insert for system" ON users;

CREATE POLICY "Enable insert for authenticated users"
ON users
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update only their own profile
DROP POLICY IF EXISTS "Enable update for own user profile" ON users;

CREATE POLICY "Enable update for own user profile"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
