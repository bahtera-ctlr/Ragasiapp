-- Add distinct "komposisi" values to the get_invoice_filter_options() RPC output,
-- so the Historis Penjualan filter UI can offer a Komposisi dropdown.
-- Must be run once in Supabase SQL editor.

CREATE OR REPLACE FUNCTION get_invoice_filter_options()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'outlets',    ARRAY(SELECT DISTINCT outlet_name FROM invoice_history WHERE outlet_name  IS NOT NULL ORDER BY outlet_name),
    'nama_barang',ARRAY(SELECT DISTINCT nama_barang  FROM invoice_history WHERE nama_barang  IS NOT NULL ORDER BY nama_barang),
    'principles', ARRAY(SELECT DISTINCT principle    FROM invoice_history WHERE principle    IS NOT NULL ORDER BY principle),
    'mes',        ARRAY(SELECT DISTINCT me           FROM invoice_history WHERE me           IS NOT NULL ORDER BY me),
    'komposisi',  ARRAY(SELECT DISTINCT komposisi    FROM invoice_history WHERE komposisi    IS NOT NULL ORDER BY komposisi),
    'count',      (SELECT COUNT(*) FROM invoice_history)
  );
$$;

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION get_invoice_filter_options() TO authenticated;
