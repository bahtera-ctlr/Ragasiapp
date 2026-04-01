-- ====== SETUP LENGKAP - JALANKAN INI DI SUPABASE ======
-- File ini menggabungkan auth setup + features setup
-- Copy-paste seluruh file ini dan RUN di Supabase SQL Editor

-- ====== CLEAR EXISTING SETUP (untuk menghindari conflict) ======
-- Matikan RLS terlebih dahulu sebelum drop tables
DROP TABLE IF EXISTS staging_products CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- ====== PART 1: USERS TABLE ======
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin_keuangan', 'marketing', 'fakturis', 'admin_logistik', 'admin_ekspedisi', 'super_admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY user_read_own_data ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY user_update_own_data ON users
  FOR UPDATE
  USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY admin_create_users ON users
  FOR INSERT
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin' OR auth.uid() IS NULL);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Function untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====== PART 2: ORDERS TABLE ======
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id TEXT NOT NULL,
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  total_discount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'packed', 'shipped', 'completed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY orders_read_own ON orders
  FOR SELECT
  USING (
    auth.uid() = marketing_id OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_keuangan' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik'
  );

CREATE POLICY orders_marketing_create ON orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = marketing_id AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  );

CREATE POLICY orders_update_own ON orders
  FOR UPDATE
  USING (
    auth.uid() = marketing_id AND (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  )
  WITH CHECK (
    auth.uid() = marketing_id AND (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  );

-- Indexes for orders
CREATE INDEX idx_orders_outlet_id ON orders(outlet_id);
CREATE INDEX idx_orders_marketing_id ON orders(marketing_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Trigger for orders
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====== PART 3: INVOICES TABLE ======
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  outlet_id TEXT NOT NULL,
  invoice_number TEXT UNIQUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'released', 'paid', 'cancelled')),
  released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  released_at TIMESTAMP,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY invoices_read_all ON invoices
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_keuangan', 'fakturis', 'super_admin')
  );

CREATE POLICY invoices_marketing_read ON invoices
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  );

CREATE POLICY invoices_marketing_create ON invoices
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  );

CREATE POLICY invoices_marketing_update ON invoices
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  );

-- Indexes for invoices
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Trigger for invoices
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====== PART 4: SHIPMENTS TABLE ======
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'packing', 'packed', 'shipped', 'delivered')),
  packing_notes TEXT,
  delivery_notes TEXT,
  logistics_in_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  logistics_out_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipments
CREATE POLICY shipments_read_logistics ON shipments
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_logistik', 'admin_ekspedisi', 'super_admin')
  );

CREATE POLICY shipments_update_logistics ON shipments
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_logistik', 'admin_ekspedisi', 'super_admin')
  );

-- Indexes for shipments
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_status ON shipments(status);

-- Trigger for shipments
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====== PART 5: STAGING_PRODUCTS TABLE ======
CREATE TABLE staging_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  total_rows INT,
  processed_rows INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE staging_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staging_products
CREATE POLICY staging_products_own ON staging_products
  FOR SELECT
  USING (auth.uid() = uploaded_by OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY staging_products_logistik_upload ON staging_products
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik'
  );

CREATE POLICY staging_products_update ON staging_products
  FOR UPDATE
  USING (
    auth.uid() = uploaded_by OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- ====== SETUP COMPLETE ======
-- Semua tables, policies, indexes, dan triggers sudah dibuat dengan benar!
-- Sekarang Anda bisa:
-- 1. Login dan buat akun dengan berbagai role
-- 2. Start menggunakan sistem
