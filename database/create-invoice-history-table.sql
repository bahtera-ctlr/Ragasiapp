-- Drop existing withdrawal_history and create proper invoice_history table
DROP TABLE IF EXISTS withdrawal_history CASCADE;

-- Create invoice_history table (was withdrawal_history)
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gudang TEXT,                              -- Asal stok barang
  no_faktur BIGINT,                         -- Nomor faktur dari Zahir
  salesman TEXT,                            -- Nama petugas fakturis
  no_outlet BIGINT,                         -- Nomor identifikasi outlet
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,  -- FK to outlets for filtering
  nama_barang TEXT NOT NULL,                -- Nama barang / SKU
  tgl DATE NOT NULL,                        -- Tanggal faktur tercetak
  qty TEXT,                                 -- Quantity barang
  sat TEXT,                                 -- Satuan (unit)
  disc NUMERIC,                             -- Diskon barang
  dpp NUMERIC,                              -- Nilai sebelum PPN
  penjualan NUMERIC,                        -- Nilai setelah PPN
  bln INTEGER,                              -- Bulan (1-12)
  principle TEXT,                           -- Perusahaan dagang farmasi
  komposisi TEXT,                           -- Jenis isi obat
  me TEXT,                                  -- Marketing Executive
  lh_lb TEXT,                               -- Program (renamed from lh/lb)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- User who uploaded
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_history
-- Allow authenticated users to view all invoice history
CREATE POLICY "Authenticated users can view invoice history" ON invoice_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow super admins to insert/update invoice history
CREATE POLICY "Super admins can insert invoice history" ON invoice_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Super admins can update invoice history" ON invoice_history
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Super admins can delete invoice history" ON invoice_history
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_history_tgl ON invoice_history(tgl);
CREATE INDEX IF NOT EXISTS idx_invoice_history_no_faktur ON invoice_history(no_faktur);
CREATE INDEX IF NOT EXISTS idx_invoice_history_no_outlet ON invoice_history(no_outlet);
CREATE INDEX IF NOT EXISTS idx_invoice_history_outlet_id ON invoice_history(outlet_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_salesman ON invoice_history(salesman);
CREATE INDEX IF NOT EXISTS idx_invoice_history_principle ON invoice_history(principle);
CREATE INDEX IF NOT EXISTS idx_invoice_history_bln ON invoice_history(bln);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created_at ON invoice_history(created_at);
