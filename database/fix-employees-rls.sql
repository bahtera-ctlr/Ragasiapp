-- Fix employees RLS policy untuk allow admin_logistik dan admin_ekspedisi untuk read
-- Jalankan ini di Supabase SQL Editor

DROP POLICY IF EXISTS employees_read_admin ON public.employees;
DROP POLICY IF EXISTS employees_read_all_admin ON public.employees;

-- Updated RLS Policy: Admin keuangan, logistik, ekspedisi, fakturis, and super_admin bisa baca
CREATE POLICY employees_read_all_admin ON public.employees
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin_keuangan', 'admin_logistik', 'admin_ekspedisi', 'fakturis', 'super_admin')
  );

-- Keep write policy tetap hanya untuk keuangan dan super_admin
DROP POLICY IF EXISTS employees_write_admin ON public.employees;

CREATE POLICY employees_write_admin ON public.employees
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  );

SELECT 'Employees RLS policy updated successfully' AS status;
