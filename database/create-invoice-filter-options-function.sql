-- Create RPC function to get all distinct invoice filter option values in one query.
-- Uses SELECT DISTINCT at the DB level — bypasses Supabase max_rows=1000 limit completely.
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
    'count',      (SELECT COUNT(*) FROM invoice_history)
  );
$$;

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION get_invoice_filter_options() TO authenticated;
