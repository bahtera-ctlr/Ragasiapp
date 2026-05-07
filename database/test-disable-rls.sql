-- Temporarily disable RLS to test if the upload works
-- This will help us debug whether RLS is the real problem

-- Disable RLS completely
ALTER TABLE faktur_images DISABLE ROW LEVEL SECURITY;

-- Or if disabling doesn't work, drop all policies
DROP POLICY IF EXISTS "faktur_images_select_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_insert_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_update_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_delete_policy" ON faktur_images;

-- Re-enable RLS with VERY permissive policies
ALTER TABLE faktur_images ENABLE ROW LEVEL SECURITY;

-- Single policy that allows everything for authenticated users
CREATE POLICY "faktur_images_all"
  ON faktur_images
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
