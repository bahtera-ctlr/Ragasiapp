-- ====== ORDERS TABLE ======CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id TEXT NOT NULL,
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL, -- Array of {product_id, qty, price, discount, subtotal}
  total_amount NUMERIC NOT NULL,
  total_discount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'packed', 'shipped', 'completed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====== INVOICES TABLE ======
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  outlet_id TEXT NOT NULL,
  invoice_number TEXT UNIQUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'released', 'paid', 'cancelled')),
  released_by UUID REFERENCES auth.users(id),
  released_at TIMESTAMP,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====== SHIPMENTS TABLE ======
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'packing', 'packed', 'shipped', 'delivered')),
  packing_notes TEXT,
  delivery_notes TEXT,
  logistics_in_id UUID REFERENCES auth.users(id), -- Admin Logistik In
  logistics_out_id UUID REFERENCES auth.users(id), -- Admin Logistik Out
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====== STAGING_PRODUCTS TABLE (untuk bulk upload) ======
CREATE TABLE IF NOT EXISTS staging_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT,
  total_rows INT,
  processed_rows INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ====== ENABLE RLS ======
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_products ENABLE ROW LEVEL SECURITY;

-- ====== ORDERS RLS ======
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

-- ====== INVOICES RLS ======
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
  );

-- ====== SHIPMENTS RLS ======
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

-- ====== STAGING_PRODUCTS RLS ======
CREATE POLICY staging_products_own ON staging_products
  FOR SELECT
  US

CREATE POLICY staging_products_update ON staging_products
  FOR UPDATE
  USING (
    auth.uid() = uploaded_by OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );ING (auth.uid() = uploaded_by OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY staging_products_logistik_upload ON staging_products
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik'
  );

-- ====== CREATE INDEXES ======
CREATE INDEX idx_orders_outlet_id ON orders(outlet_id);
CREATE INDEX idx_orders_marketing_id ON orders(marketing_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_status ON shipments(status);

-- ====== AUTO UPDATE TIMESTAMP ======
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
