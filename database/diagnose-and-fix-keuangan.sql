-- ============================================
-- DIAGNOSIS & FIX: Admin Keuangan Notes Feature
-- ============================================

-- STEP 1: Check if columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('keuangan_notes', 'keuangan_reviewed_by', 'keuangan_reviewed_at');

-- STEP 2: If columns don't exist, create them
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS keuangan_notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS keuangan_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS keuangan_reviewed_at TIMESTAMP;

-- STEP 3: Update status constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'posted', 'released', 'rejected', 'paid', 'cancelled'));

-- STEP 4: Remove old RLS policies and create new ones
DROP POLICY IF EXISTS invoices_read_all ON invoices;
DROP POLICY IF EXISTS invoices_marketing_read ON invoices;
DROP POLICY IF EXISTS invoices_marketing_create ON invoices;
DROP POLICY IF EXISTS invoices_marketing_update ON invoices;
DROP POLICY IF EXISTS invoices_keuangan_update ON invoices;

-- STEP 5: Create comprehensive RLS policies
-- Allow super_admin to do everything
CREATE POLICY invoices_super_admin_all ON invoices
  AS PERMISSIVE FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- Allow admin_keuangan to read all invoices
CREATE POLICY invoices_admin_keuangan_read ON invoices
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  );

-- Allow admin_keuangan to update invoices
CREATE POLICY invoices_admin_keuangan_update ON invoices
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  );

-- Allow marketing to read their own invoices
CREATE POLICY invoices_marketing_read ON invoices
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  );

-- Allow marketing to create invoices
CREATE POLICY invoices_marketing_create ON invoices
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
  );

-- Allow marketing to update their own invoices (before posting)
CREATE POLICY invoices_marketing_update ON invoices
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
    AND status IN ('draft')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'marketing'
    AND status IN ('draft', 'posted')
  );

-- Allow fakturis to read all invoices
CREATE POLICY invoices_fakturis_read ON invoices
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('fakturis', 'super_admin')
  );

-- STEP 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_keuangan_reviewed_at ON invoices(keuangan_reviewed_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- STEP 7: Verify the setup
SELECT 
  (SELECT COUNT(*) FROM invoices) as total_invoices,
  (SELECT COUNT(*) FROM invoices WHERE keuangan_notes IS NOT NULL) as invoices_with_notes,
  (SELECT COUNT(*) FROM invoices WHERE status = 'posted') as posted_invoices,
  (SELECT COUNT(*) FROM invoices WHERE status = 'released') as released_invoices,
  (SELECT COUNT(*) FROM invoices WHERE status = 'rejected') as rejected_invoices;
