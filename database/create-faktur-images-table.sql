-- Create faktur_images table to store references to uploaded images
CREATE TABLE IF NOT EXISTS faktur_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  image_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL DEFAULT auth.uid(),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_faktur_images_invoice_id ON faktur_images(invoice_id);
CREATE INDEX IF NOT EXISTS idx_faktur_images_uploaded_by ON faktur_images(uploaded_by);

-- Enable RLS
ALTER TABLE faktur_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies jika ada
DROP POLICY IF EXISTS "Allow fakturis and super_admin to view faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow fakturis and super_admin to insert faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow fakturis and super_admin to delete faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow authenticated to view faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow authenticated to insert faktur images" ON faktur_images;
DROP POLICY IF EXISTS "Allow authenticated to delete own faktur images" ON faktur_images;

-- Create RLS policy to allow authenticated users to view all images
CREATE POLICY "faktur_images_view_policy"
  ON faktur_images FOR SELECT
  TO authenticated
  USING (true);

-- Create RLS policy to allow authenticated users to insert images
-- Note: uploaded_by is auto-set by database DEFAULT auth.uid(), so we allow all authenticated users
CREATE POLICY "faktur_images_insert_policy"
  ON faktur_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create RLS policy to allow users to delete their own images
CREATE POLICY "faktur_images_delete_policy"
  ON faktur_images FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Note: Create storage bucket named 'faktur-images' with the following settings:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket named: faktur-images
-- 3. Set to PUBLIC (for reading images)
-- 4. Users with role 'fakturis' or 'super_admin' can upload images
