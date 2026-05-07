-- Fix RLS Policies for faktur_images table
-- This allows authenticated users to insert their own images

-- Drop existing policies
DROP POLICY IF EXISTS "faktur_images_view_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_insert_policy" ON faktur_images;
DROP POLICY IF EXISTS "faktur_images_delete_policy" ON faktur_images;

-- Create RLS policies for faktur_images table

-- Policy 1: Allow authenticated to VIEW all images
CREATE POLICY "faktur_images_view_policy"
  ON faktur_images FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Allow authenticated to INSERT images
CREATE POLICY "faktur_images_insert_policy"
  ON faktur_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Policy 3: Allow authenticated to DELETE their own images
CREATE POLICY "faktur_images_delete_policy"
  ON faktur_images FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Enable RLS on faktur_images table
ALTER TABLE faktur_images ENABLE ROW LEVEL SECURITY;
