-- Fix: Allow fakturis role to read orders
-- Problem: Fakturis cannot export invoice items because they cannot read the orders table due to RLS

-- Drop the existing read policy
DROP POLICY IF EXISTS orders_read_own ON orders;

-- Create new policy that includes fakturis role
CREATE POLICY orders_read_all ON orders
  FOR SELECT
  USING (
    auth.uid() = marketing_id OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_keuangan' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin_logistik' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'fakturis'
  );
