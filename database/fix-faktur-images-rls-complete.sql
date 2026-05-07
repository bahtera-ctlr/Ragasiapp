-- Fix faktur_images RLS policies - Complete setup with 4 policies
-- This allows authenticated users full access to their own and all records

-- First, drop all existing policies
DROP POLICY IF EXISTS "faktur_images_authenticated_select" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_authenticated_insert" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_authenticated_delete" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_insert_allow_all" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_select_allow_all" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_delete_allow_all" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_view_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_insert_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_delete_policy" ON faktur_images;
DROP POLICY IF EXISTS "Allow fakturis and super_admin to view faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow fakturis and super_admin to insert faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow fakturis and super_admin to delete faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow authenticated to view faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow authenticated to insert faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow authenticated to delete own faktur images" ON faktur_images;

-- Enable RLS
ALTER TABLE faktur_images ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Allow authenticated users to view all images
CREATE POLICY "faktur_images_select_policy"
  ON faktur_images
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: INSERT - Allow authenticated users to insert new images
CREATE POLICY "faktur_images_insert_policy"
  ON faktur_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: UPDATE - Allow authenticated users to update images (if needed)
CREATE POLICY "faktur_images_update_policy"
  ON faktur_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: DELETE - Allow authenticated users to delete images
CREATE POLICY "faktur_images_delete_policy"
  ON faktur_images
  FOR DELETE
  TO authenticated
  USING (true);
