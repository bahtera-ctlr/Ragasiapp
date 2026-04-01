-- Fix RLS for admin_logistik to read invoices
-- Allow admin_logistik to read invoices with released status
DROP POLICY IF EXISTS "admin_logistik can read released invoices" ON invoices;

CREATE POLICY "admin_logistik can read released invoices"
ON invoices
FOR SELECT
USING (
  status = 'released' 
  AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik'
);

-- Allow admin_ekspedisi to read packed invoices
DROP POLICY IF EXISTS "admin_ekspedisi can read packed invoices" ON invoices;

CREATE POLICY "admin_ekspedisi can read packed invoices"
ON invoices
FOR SELECT
USING (
  (status = 'released' AND logistik_in_status = 'terpacking')
  AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin_ekspedisi'
);

-- Allow updates for admin_logistik
DROP POLICY IF EXISTS "admin_logistik can update packing status" ON invoices;

CREATE POLICY "admin_logistik can update packing status"
ON invoices
FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik'
);
