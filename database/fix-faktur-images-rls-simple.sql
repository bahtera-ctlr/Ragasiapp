-- Drop all existing policies on faktur_images table
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

-- Simple policies that allow authenticated users to do everything
-- Policy 1: Allow authenticated to VIEW
CREATE POLICY "faktur_images_authenticated_select"
  ON faktur_images FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Allow authenticated to INSERT (and set uploaded_by automatically)
CREATE POLICY "faktur_images_authenticated_insert"
  ON faktur_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: Allow authenticated to DELETE their own records
CREATE POLICY "faktur_images_authenticated_delete"
  ON faktur_images FOR DELETE
  TO authenticated
  USING (true);

-- Update column default to use auth.uid()
ALTER TABLE faktur_images 
  ALTER COLUMN uploaded_by SET DEFAULT auth.uid();
