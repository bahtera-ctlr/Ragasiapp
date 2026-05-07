-- IMPORTANT: This SQL won't work directly (storage.objects is system table)
-- Use this as REFERENCE for creating policies via Dashboard UI
--
-- You MUST create these policies via Supabase Dashboard UI:
-- Go to: Storage → Buckets → faktur-images → Policies
--
-- Delete all existing policies first
-- Then create these 3 policies via Dashboard:

-- ============================================================
-- STORAGE BUCKET POLICIES (create via Dashboard UI)
-- ============================================================

-- POLICY 1: INSERT - Allow authenticated to upload
-- Name: Allow authenticated to upload to faktur-images
-- Operation: INSERT
-- For: authenticated
-- Definition: bucket_id = 'faktur-images'

-- POLICY 2: SELECT - Allow public to view
-- Name: Allow public to view faktur-images
-- Operation: SELECT  
-- For: public
-- Definition: bucket_id = 'faktur-images'

-- POLICY 3: DELETE - Allow authenticated to delete own files
-- Name: Allow authenticated to delete from faktur-images
-- Operation: DELETE
-- For: authenticated
-- Definition: bucket_id = 'faktur-images' AND owner_id = auth.uid()

-- ============================================================
-- For database table faktur_images, use permissive policies:
-- ============================================================

-- Drop all policies on database table
DROP POLICY IF EXISTS "faktur_images_all" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_select_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_insert_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_update_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_delete_policy" ON faktur_images;

-- Re-enable RLS
ALTER TABLE faktur_images ENABLE ROW LEVEL SECURITY;

-- Single permissive policy for authenticated users
CREATE POLICY "faktur_images_authenticated_all"
  ON faktur_images
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
