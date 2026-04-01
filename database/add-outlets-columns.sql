-- ====== UPDATE OUTLETS TABLE WITH NEW COLUMNS ======
-- Jalankan ini di Supabase SQL Editor untuk add kolom baru

-- Add missing columns ke outlets table
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS nio BIGINT UNIQUE;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS kelompok VARCHAR(100);
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS limit_rupiah NUMERIC(15, 2);
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS top_hari INTEGER;

-- Add indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_outlets_nio ON public.outlets(nio);
CREATE INDEX IF NOT EXISTS idx_outlets_kelompok ON public.outlets(kelompok);

-- Add updated_at timestamp jika belum ada
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create trigger untuk update timestamp
DROP TRIGGER IF EXISTS update_outlets_updated_at ON public.outlets;

CREATE TRIGGER update_outlets_updated_at
BEFORE UPDATE ON public.outlets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

SELECT 'Outlets table updated successfully' AS status;
