-- ====== SAFE OUTLET UPDATE WITH SOFT DELETE ======
-- Jalankan ini di Supabase SQL Editor

-- Step 1: Add is_active column untuk soft delete
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 2: Create indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_outlets_is_active ON public.outlets(is_active);

-- Step 3: Drop old RPC function
DROP FUNCTION IF EXISTS public.refresh_outlets_data(jsonb) CASCADE;

-- Step 4: Create NEW RPC function dengan SOFT DELETE approach
CREATE OR REPLACE FUNCTION public.refresh_outlets_data(p_outlets_data jsonb)
RETURNS TABLE(success BOOLEAN, message TEXT, count_inserted INT) AS $$
DECLARE
  v_count INT;
BEGIN
  -- Step 1: Mark old outlets as inactive (soft delete, not hard delete)
  UPDATE public.outlets SET is_active = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Marked % outlets as inactive', v_count;
  
  -- Step 2: Disconnect orders from old outlets (prevent orphan records)
  UPDATE public.orders SET outlet_id = NULL 
  WHERE outlet_id IN (SELECT id FROM public.outlets WHERE is_active = false);
  
  -- Step 3: Insert new outlets as active
  INSERT INTO public.outlets (nio, name, me, cluster, kelompok, limit_rupiah, top_hari, current_saldo, is_active, updated_at)
  SELECT
    (item->>'nio')::TEXT,
    (item->>'name')::TEXT,
    (item->>'me')::TEXT,
    (item->>'cluster')::TEXT,
    (item->>'kelompok')::TEXT,
    CASE 
      WHEN (item->>'limit_rupiah') IS NULL OR (item->>'limit_rupiah') = '' OR (item->>'limit_rupiah')::TEXT = 'null' THEN NULL
      WHEN (item->>'limit_rupiah')::TEXT ~ '^[0-9.]+$' THEN (item->>'limit_rupiah')::NUMERIC(15,2)
      ELSE NULL
    END,
    CASE 
      WHEN (item->>'top_hari') IS NULL OR (item->>'top_hari') = '' OR (item->>'top_hari')::TEXT = 'null' THEN NULL
      WHEN (item->>'top_hari')::TEXT ~ '^[0-9]+$' THEN (item->>'top_hari')::INTEGER
      ELSE NULL
    END,
    CASE 
      WHEN (item->>'current_saldo') IS NULL OR (item->>'current_saldo') = '' OR (item->>'current_saldo')::TEXT = 'null' THEN NULL
      WHEN (item->>'current_saldo')::TEXT ~ '^[0-9.]+$' THEN (item->>'current_saldo')::NUMERIC(15,2)
      ELSE NULL
    END,
    true as is_active,
    NOW()
  FROM jsonb_array_elements(p_outlets_data) AS item;
  
  GET DIAGNOSTICS count_inserted = ROW_COUNT;
  
  RETURN QUERY SELECT TRUE, 'Success: ' || count_inserted || ' outlets activated, old ones marked inactive', count_inserted;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, 'Error: ' || SQLERRM, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_outlets_data(jsonb) TO authenticated;

-- Verify
SELECT COUNT(*) as total_outlets, 
       SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_outlets,
       SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) as inactive_outlets
FROM public.outlets;
