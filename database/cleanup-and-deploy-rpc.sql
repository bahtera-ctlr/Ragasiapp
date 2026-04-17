-- ====== CLEANUP + RPC DEPLOYMENT SCRIPT ======
-- Jalankan SELURUH script ini di Supabase SQL Editor
-- Jangan jalankan per-lines - jalankan sekaligus!

-- STEP 0: Drop old function first
DROP FUNCTION IF EXISTS public.refresh_outlets_data(jsonb) CASCADE;

-- STEP 1: Delete all referencing data
DELETE FROM public.invoices WHERE outlet_id IS NOT NULL;
DELETE FROM public.orders WHERE outlet_id IS NOT NULL;
DELETE FROM public.out_of_stock_requests WHERE outlet_id IS NOT NULL;

-- STEP 2: Force clear outlets table
DELETE FROM public.outlets;

-- STEP 3: Create NEW RPC function
CREATE OR REPLACE FUNCTION public.refresh_outlets_data(p_outlets_data jsonb)
RETURNS TABLE(success BOOLEAN, message TEXT, count_inserted INT) AS $$
DECLARE
  v_count INT;
  v_duplicate_count INT;
BEGIN
  -- STEP 1: Count existing outlets first
  SELECT COUNT(*) INTO v_duplicate_count FROM public.outlets;
  RAISE NOTICE 'Existing outlets before cleanup: %', v_duplicate_count;

  -- STEP 2: Delete ALL referencing records first (depth-first approach)
  BEGIN
    DELETE FROM public.invoices 
    WHERE outlet_id IS NOT NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % invoices', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Invoices delete (OK): %', SQLERRM;
  END;

  BEGIN
    DELETE FROM public.orders 
    WHERE outlet_id IS NOT NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orders', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Orders delete (OK): %', SQLERRM;
  END;
  
  BEGIN
    DELETE FROM public.out_of_stock_requests 
    WHERE outlet_id IS NOT NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % out_of_stock_requests', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Out of stock delete (OK): %', SQLERRM;
  END;

  -- STEP 3: Disable ALL foreign key constraints temporarily
  BEGIN
    ALTER TABLE public.outlets DISABLE TRIGGER ALL;
    RAISE NOTICE 'Disabled triggers on outlets';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Trigger disable (OK): %', SQLERRM;
  END;

  -- STEP 4: Delete all outlets records (the main cleanup)
  BEGIN
    DELETE FROM public.outlets;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old outlets', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Outlets delete failed: %', SQLERRM;
  END;

  -- STEP 5: Re-enable triggers
  BEGIN
    ALTER TABLE public.outlets ENABLE TRIGGER ALL;
    RAISE NOTICE 'Re-enabled triggers on outlets';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Trigger enable (OK): %', SQLERRM;
  END;

  -- STEP 6: Insert new outlets from JSON array
  BEGIN
    INSERT INTO public.outlets (nio, name, me, cluster, kelompok, limit_rupiah, top_hari, due, current_saldo, updated_at)
    SELECT
      (item->>'nio')::TEXT as nio,
      (item->>'name')::TEXT,
      (item->>'me')::TEXT,
      (item->>'cluster')::TEXT,
      (item->>'kelompok')::TEXT,
      CASE 
        WHEN (item->>'limit_rupiah') IS NULL OR (item->>'limit_rupiah') = '' THEN NULL
        ELSE (item->>'limit_rupiah')::NUMERIC(15,2)
      END as limit_rupiah,
      CASE 
        WHEN (item->>'top_hari') IS NULL OR (item->>'top_hari') = '' THEN NULL
        ELSE (item->>'top_hari')::INTEGER
      END as top_hari,
      CASE
        WHEN (item->>'due') IS NULL OR (item->>'due') = '' THEN NULL
        ELSE (item->>'due')::INTEGER
      END as due,
      CASE 
        WHEN (item->>'current_saldo') IS NULL OR (item->>'current_saldo') = '' THEN NULL
        ELSE (item->>'current_saldo')::NUMERIC(15,2)
      END as current_saldo,
      NOW()
    FROM jsonb_array_elements(p_outlets_data) AS item;
    
    GET DIAGNOSTICS count_inserted = ROW_COUNT;
    RAISE NOTICE 'Inserted % new outlets', count_inserted;
    
    RETURN QUERY SELECT 
      TRUE as success,
      'Successfully refreshed outlets' as message,
      count_inserted;
      
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      FALSE as success,
      'Insert failed: ' || SQLERRM as message,
      0 as count_inserted;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.refresh_outlets_data(jsonb) TO authenticated;

-- VERIFICATION: Show final status
SELECT 
  'RPC Function Deployed' as status,
  COUNT(*) as remaining_outlets
FROM public.outlets;
