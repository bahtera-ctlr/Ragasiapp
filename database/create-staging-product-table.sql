-- CREATE ACTUAL PRODUCTS TABLE (SEPARATE from staging_products metadata table)
-- This table stores the actual product data from CSV uploads
-- staging_products in the original schema was only for upload metadata tracking

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_barang VARCHAR(50) NOT NULL UNIQUE,
  nama_barang VARCHAR(255) NOT NULL,
  golongan_barang VARCHAR(100),
  program VARCHAR(100),
  bobot_poin NUMERIC(10, 2),
  komposisi TEXT,
  principle VARCHAR(255),
  satuan_harga NUMERIC(12, 2),
  harga_jual_ragasi NUMERIC(12, 2),
  stok INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users to read products
CREATE POLICY products_read_all ON public.products
  FOR SELECT
  USING (true);

-- Allow admin_logistik to insert/update/delete
CREATE POLICY products_admin_modify ON public.products
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_nomor_barang ON public.products(nomor_barang);
CREATE INDEX IF NOT EXISTS idx_products_nama_barang ON public.products(nama_barang);
CREATE INDEX IF NOT EXISTS idx_products_stok ON public.products(stok);
