-- Temporary: Disable RLS to test if insert works
ALTER TABLE faktur_images DISABLE ROW LEVEL SECURITY;

-- Test insert manually
-- This should work if RLS is not the issue
-- INSERT INTO faktur_images (invoice_id, image_path, uploaded_by)
-- VALUES ('test-invoice-id', 'test-path.jpg', auth.uid());

-- Drop all policies
DROP POLICY IF EXISTS "faktur_images_authenticated_select" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_authenticated_insert" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_authenticated_delete" ON faktur_images;

-- Re-enable RLS
ALTER TABLE faktur_images ENABLE ROW LEVEL SECURITY;

-- Create very permissive policy for INSERT (allow anyone authenticated to insert)
CREATE POLICY "faktur_images_insert_allow_all"
  ON faktur_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow all inserts from authenticated users

-- Policy for SELECT
CREATE POLICY "faktur_images_select_allow_all"
  ON faktur_images
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all selects for authenticated users

-- Policy for DELETE
CREATE POLICY "faktur_images_delete_allow_all"
  ON faktur_images
  FOR DELETE
  TO authenticated
  USING (true);  -- Allow all deletes for authenticated users
