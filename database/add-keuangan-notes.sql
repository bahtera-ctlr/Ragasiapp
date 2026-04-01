-- Migration: Add admin keuangan notes and update invoice status options

-- 1. Add new column for admin keuangan notes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS keuangan_notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS keuangan_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS keuangan_reviewed_at TIMESTAMP;

-- 2. Update the status CHECK constraint to include 'rejected'
-- First, we need to drop the existing constraint and recreate it
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices 
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'posted', 'released', 'rejected', 'paid', 'cancelled'));

-- 3. Ensure RLS policy allows admin_keuangan to update invoices
CREATE POLICY invoices_keuangan_update ON invoices
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  );

-- 4. Index for keuangan_reviewed_at for faster filtering
CREATE INDEX IF NOT EXISTS idx_invoices_keuangan_reviewed_at ON invoices(keuangan_reviewed_at);
