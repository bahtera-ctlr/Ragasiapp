-- ====== CEK FAKTUR: Invoice Aging (Piutang) Table + Upsert RPC ======
-- Jalankan ini di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.invoice_aging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales TEXT,
  pic TEXT,
  kecamatan TEXT,
  no_outlet TEXT,
  me TEXT,
  jad_tag TEXT,
  nama_outlet TEXT NOT NULL,
  no_faktur TEXT NOT NULL UNIQUE,
  tgl_faktur DATE,
  tgl_japo DATE,
  saldo NUMERIC(15,2),
  top_hari INTEGER,
  nilai TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_by_name TEXT,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_aging_no_outlet ON public.invoice_aging(no_outlet);
CREATE INDEX IF NOT EXISTS idx_invoice_aging_sales ON public.invoice_aging(sales);
CREATE INDEX IF NOT EXISTS idx_invoice_aging_tgl_japo ON public.invoice_aging(tgl_japo);

ALTER TABLE public.invoice_aging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.invoice_aging;
CREATE POLICY "Allow all for authenticated users" ON public.invoice_aging
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Upsert by no_faktur (preserve confirmation fields), remove invoices no longer in the new upload (paid off)
CREATE OR REPLACE FUNCTION public.refresh_invoice_aging_data(p_rows jsonb)
RETURNS TABLE(success BOOLEAN, message TEXT, count_upserted INT, count_removed INT) AS $$
DECLARE
  v_upserted INT;
  v_removed INT;
BEGIN
  DELETE FROM public.invoice_aging
  WHERE no_faktur NOT IN (
    SELECT (item->>'no_faktur') FROM jsonb_array_elements(p_rows) AS item
  );
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  INSERT INTO public.invoice_aging (
    sales, pic, kecamatan, no_outlet, me, jad_tag, nama_outlet,
    no_faktur, tgl_faktur, tgl_japo, saldo, top_hari, nilai, updated_at
  )
  SELECT
    item->>'sales', item->>'pic', item->>'kecamatan', item->>'no_outlet', item->>'me', item->>'jad_tag', item->>'nama_outlet',
    item->>'no_faktur',
    CASE WHEN COALESCE(item->>'tgl_faktur','') = '' THEN NULL ELSE (item->>'tgl_faktur')::DATE END,
    CASE WHEN COALESCE(item->>'tgl_japo','') = '' THEN NULL ELSE (item->>'tgl_japo')::DATE END,
    CASE WHEN COALESCE(item->>'saldo','') = '' THEN NULL ELSE (item->>'saldo')::NUMERIC(15,2) END,
    CASE WHEN COALESCE(item->>'top_hari','') = '' THEN NULL ELSE (item->>'top_hari')::INTEGER END,
    item->>'nilai',
    NOW()
  FROM jsonb_array_elements(p_rows) AS item
  ON CONFLICT (no_faktur) DO UPDATE SET
    sales = EXCLUDED.sales, pic = EXCLUDED.pic, kecamatan = EXCLUDED.kecamatan,
    no_outlet = EXCLUDED.no_outlet, me = EXCLUDED.me, jad_tag = EXCLUDED.jad_tag,
    nama_outlet = EXCLUDED.nama_outlet, tgl_faktur = EXCLUDED.tgl_faktur,
    tgl_japo = EXCLUDED.tgl_japo, saldo = EXCLUDED.saldo, top_hari = EXCLUDED.top_hari,
    nilai = EXCLUDED.nilai, updated_at = NOW();
    -- is_confirmed / confirmed_by / confirmed_at sengaja TIDAK disentuh agar persist lintas upload

  GET DIAGNOSTICS v_upserted = ROW_COUNT;
  RETURN QUERY SELECT TRUE, 'Success', v_upserted, v_removed;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, 'Error: ' || SQLERRM, 0, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_invoice_aging_data(jsonb) TO authenticated;
