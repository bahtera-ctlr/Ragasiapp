-- ====== CLEAN SLATE: DROP OLD FUNCTIONS & TRIGGERS ======
-- Jalankan ini PERTAMA kali untuk cleanup

-- Drop trigger jika ada
DROP TRIGGER IF EXISTS trg_reduce_stock_on_order ON public.orders CASCADE;

-- Drop function jika ada (gunakan CASCADE untuk drop semua versi)
DROP FUNCTION IF EXISTS public.reduce_product_stock() CASCADE;
DROP FUNCTION IF EXISTS create_sales_order_v2 CASCADE;
DROP FUNCTION IF EXISTS create_sales_order_v2(TEXT, NUMERIC, JSONB) CASCADE;

-- Verify semua sudah terhapus
SELECT 'Cleanup complete - ready for new setup' AS status;
