-- Migration: discount_requests (quantity, invoice_id) + invoices (pb flag)
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom quantity ke discount_requests (default 1 agar data lama tidak rusak)
ALTER TABLE discount_requests
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- 2. Tambah kolom invoice_id ke discount_requests
ALTER TABLE discount_requests
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 3. Tambah kolom pb (Pesanan Berbantuan) ke invoices
--    true = invoice berasal dari pengajuan diskon yang disetujui super admin
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pb BOOLEAN NOT NULL DEFAULT FALSE;

-- Verifikasi
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE (table_name = 'discount_requests' AND column_name IN ('quantity', 'invoice_id'))
   OR (table_name = 'invoices' AND column_name = 'pb')
ORDER BY table_name, column_name;
