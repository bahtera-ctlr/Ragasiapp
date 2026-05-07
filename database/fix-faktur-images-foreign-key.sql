-- Check and potentially fix uploaded_by foreign key constraint
-- Run this AFTER the 4-policy SQL

-- First, let's remove the NOT NULL constraint if it exists
-- Make uploaded_by nullable so NULL values are allowed during insert

BEGIN;

-- Drop the foreign key constraint on uploaded_by temporarily
ALTER TABLE faktur_images DROP CONSTRAINT IF EXISTS faktur_images_uploaded_by_fkey;

-- Alter column to be nullable and re-add with proper constraint
ALTER TABLE faktur_images ALTER COLUMN uploaded_by DROP NOT NULL;

-- Re-add the foreign key constraint
ALTER TABLE faktur_images 
ADD CONSTRAINT faktur_images_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set default to auth.uid() for new inserts
ALTER TABLE faktur_images 
ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

COMMIT;

-- Now RLS should work properly with these policies
