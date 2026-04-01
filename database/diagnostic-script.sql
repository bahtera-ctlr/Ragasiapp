-- ====== DIAGNOSTIC & CLEANUP SCRIPT ======
-- Run this to verify current state and force clean

-- 1. CHECK OUTLET COUNT
SELECT COUNT(*) as total_outlets FROM public.outlets;

-- 2. CHECK SAMPLE DATA
SELECT nio, name FROM public.outlets LIMIT 10;

-- 3. FORCE CLEAN - DELETE semua yang bisa di-delete
BEGIN;
  DELETE FROM public.invoices WHERE true;
  DELETE FROM public.orders WHERE true;
  DELETE FROM public.out_of_stock_requests WHERE true;
  DELETE FROM public.outlets WHERE true;
COMMIT;

-- 4. VERIFY CLEAN
SELECT COUNT(*) FROM public.outlets;  -- Should be 0

-- 5. TEST RPC FUNCTION dengan sample data
SELECT * FROM public.refresh_outlets_data(jsonb_build_array(
  jsonb_build_object(
    'nio', '999999999',
    'name', 'Test Outlet 1',
    'me', 'John Doe',
    'cluster', 'TEST',
    'kelompok', 'TEST',
    'limit_rupiah', '1000000',
    'top_hari', '30',
    'current_saldo', '500000'
  )
));

-- 6. CHECK IF TEST DATA WAS INSERTED
SELECT * FROM public.outlets WHERE nio = '999999999';
