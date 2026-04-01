-- ====== ADD TRIGGER FOR AUTOMATIC STOCK REDUCTION ======
-- Jalankan ini di Supabase SQL Editor untuk membuat trigger otomatis

-- Drop trigger jika sudah ada
DROP TRIGGER IF EXISTS trg_reduce_stock_on_order ON public.orders CASCADE;

-- Drop function jika sudah ada
DROP FUNCTION IF EXISTS public.reduce_product_stock() CASCADE;

-- Create function yang akan mengurangi stok
CREATE OR REPLACE FUNCTION public.reduce_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
BEGIN
  -- Looping semua items dalam order
  FOR v_item IN SELECT jsonb_array_elements(NEW.items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;
    
    -- Hanya kurangi stok jika product_id ada (bukan custom items)
    IF v_product_id IS NOT NULL THEN
      UPDATE public.products 
      SET stok = stok - v_qty,
          updated_at = NOW()
      WHERE id = v_product_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger yang jalankan function saat order dibuat
CREATE TRIGGER trg_reduce_stock_on_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.reduce_product_stock();

-- Grant permission
GRANT EXECUTE ON FUNCTION public.reduce_product_stock() TO authenticated;
