-- ============================================================
-- ALL-IN-ONE FIX: Pengajuan Diskon → Approval → Invoice
-- Aman dijalankan berulang kali (menggunakan IF NOT EXISTS / OR REPLACE)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Kolom tambahan di discount_requests
ALTER TABLE discount_requests ADD COLUMN IF NOT EXISTS quantity   INTEGER NOT NULL DEFAULT 1;
ALTER TABLE discount_requests ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 2. Kolom pb (Pesanan Berbantuan) di invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pb BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Hapus policy lama jika ada (hindari error duplicate)
DROP POLICY IF EXISTS orders_super_admin_create   ON orders;
DROP POLICY IF EXISTS invoices_super_admin_create ON invoices;

-- 4. RPC Function dengan SECURITY DEFINER (bypass RLS secara aman)
CREATE OR REPLACE FUNCTION approve_discount_and_create_invoice(
  p_request_id     UUID,
  p_approved_by    UUID,
  p_approval_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dr             RECORD;
  v_product        RECORD;
  v_order_id       UUID;
  v_invoice_id     UUID;
  v_qty            INTEGER;
  v_hjr            NUMERIC;
  v_disc           NUMERIC;
  v_subtotal       NUMERIC;
  v_total_discount NUMERIC;
BEGIN
  -- Validasi caller adalah super_admin
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_approved_by AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Hanya super admin yang dapat menyetujui pengajuan';
  END IF;

  -- Ambil data pengajuan diskon
  SELECT * INTO v_dr FROM discount_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan tidak ditemukan';
  END IF;

  -- Ambil data produk
  SELECT * INTO v_product FROM products WHERE id = v_dr.product_id;

  v_qty            := COALESCE(v_dr.quantity, 1);
  v_hjr            := COALESCE(v_product.harga_jual_ragasi, 0);
  v_disc           := COALESCE(v_dr.discount_percentage, 0);
  v_subtotal       := ROUND(v_hjr * v_qty * (1.0 - v_disc / 100.0));
  v_total_discount := ROUND(v_hjr * v_qty * v_disc / 100.0);

  -- Buat order
  INSERT INTO orders (outlet_id, marketing_id, items, total_amount, total_discount, notes)
  VALUES (
    v_dr.outlet_id,
    v_dr.marketing_id,
    jsonb_build_array(jsonb_build_object(
      'product_id',   v_dr.product_id::TEXT,
      'product_name', COALESCE(v_product.nama_barang, ''),
      'qty',          v_qty,
      'price',        v_hjr,
      'discount',     v_disc,
      'subtotal',     v_subtotal
    )),
    v_subtotal,
    v_total_discount,
    'Pengajuan diskon disetujui — ' || COALESCE(v_dr.reason, '')
  )
  RETURNING id INTO v_order_id;

  -- Buat invoice (status posted, pb = true)
  INSERT INTO invoices (order_id, outlet_id, amount, status, pb, notes)
  VALUES (
    v_order_id,
    v_dr.outlet_id,
    v_subtotal,
    'posted',
    TRUE,
    'Diskon ' || v_disc || '% untuk ' || COALESCE(v_product.nama_barang, '')
      || ' — ' || COALESCE(p_approval_notes, v_dr.reason, '')
  )
  RETURNING id INTO v_invoice_id;

  -- Update discount_request menjadi approved
  UPDATE discount_requests
  SET
    status         = 'approved',
    approved_by    = p_approved_by,
    approved_at    = NOW(),
    approval_notes = p_approval_notes,
    invoice_id     = v_invoice_id,
    updated_at     = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success',    TRUE,
    'order_id',   v_order_id,
    'invoice_id', v_invoice_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- 5. Beri izin execute ke authenticated users
GRANT EXECUTE ON FUNCTION approve_discount_and_create_invoice(UUID, UUID, TEXT)
  TO authenticated;

-- Verifikasi
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'approve_discount_and_create_invoice';
