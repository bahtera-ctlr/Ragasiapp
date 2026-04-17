-- ====== ADD DUE COLUMN AND DEPLOY OUTLET REFRESH RPC ======
-- Jalankan ini di Supabase SQL Editor.

-- 1) Tambahkan kolom due ke tabel outlets jika belum ada
ALTER TABLE public.outlets
ADD COLUMN IF NOT EXISTS due INTEGER;

-- 2) Deploy ulang fungsi RPC yang dipakai oleh upload CSV outlet
DROP FUNCTION IF EXISTS public.refresh_outlets_data(jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.refresh_outlets_data(p_outlets_data jsonb)
RETURNS TABLE(success BOOLEAN, message TEXT, count_inserted INT) AS $$
BEGIN
  -- Hapus semua outlet lama sebelum insert ulang
  DELETE FROM public.outlets WHERE true;

  INSERT INTO public.outlets (
    nio,
    name,
    me,
    cluster,
    kelompok,
    limit_rupiah,
    top_hari,
    due,
    current_saldo,
    updated_at
  )
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
      WHEN (item->>'due') IS NULL OR (item->>'due') = '' OR (item->>'due')::TEXT = 'null' THEN NULL
      WHEN (item->>'due')::TEXT ~ '^[0-9]+$' THEN (item->>'due')::INTEGER
      ELSE NULL
    END,
    CASE
      WHEN (item->>'current_saldo') IS NULL OR (item->>'current_saldo') = '' OR (item->>'current_saldo')::TEXT = 'null' THEN NULL
      WHEN (item->>'current_saldo')::TEXT ~ '^[0-9.]+$' THEN (item->>'current_saldo')::NUMERIC(15,2)
      ELSE NULL
    END,
    NOW()
  FROM jsonb_array_elements(p_outlets_data) AS item;

  GET DIAGNOSTICS count_inserted = ROW_COUNT;

  RETURN QUERY SELECT TRUE, 'Success: ' || count_inserted || ' outlets inserted', count_inserted;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, 'Error: ' || SQLERRM, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_outlets_data(jsonb) TO authenticated;

SELECT 'DUE column ditambahkan dan RPC refresh_outlets_data telah dideploy ulang' AS status;
