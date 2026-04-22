-- ====== CREATE RPC FUNCTION FOR SALES ORDER ======
-- Jalankan ini di Supabase SQL Editor

-- Drop semua versions function yang sudah ada
DROP FUNCTION IF EXISTS create_sales_order() CASCADE;
DROP FUNCTION IF EXISTS create_sales_order(TEXT, NUMERIC, JSONB) CASCADE;
DROP FUNCTION IF EXISTS create_sales_order_v2(TEXT, NUMERIC, JSONB) CASCADE;

-- Create function yang baru dengan nama yang unik
CREATE FUNCTION create_sales_order_v2(
  p_outlet_id TEXT,
  p_total NUMERIC,
  p_items JSONB,
  p_shipping_request TEXT DEFAULT 'REGULER'
)
RETURNS TABLE(order_id UUID, invoice_id UUID, success BOOLEAN) AS $$
DECLARE
  v_order_id UUID;
  v_invoice_id UUID;
  v_user_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_available_stock INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate shipping request
  IF p_shipping_request NOT IN ('OTS', 'REGULER', 'EXPRESS') THEN
    RAISE EXCEPTION 'Invalid shipping request: must be OTS, REGULER, or EXPRESS';
  END IF;

  -- Check stock availability for all items with product_id
  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;
    
    -- Only check if product_id exists (not custom items)
    IF v_product_id IS NOT NULL THEN
      -- Get current stock
      SELECT stok INTO v_available_stock FROM products WHERE id = v_product_id;
      
      -- Check if stock is sufficient
      IF v_available_stock IS NULL OR v_available_stock < v_qty THEN
        RAISE EXCEPTION 'Stok tidak mencukupi: Produk ID % hanya tersedia % unit, diminta %', 
          v_product_id, COALESCE(v_available_stock, 0), v_qty;
      END IF;
    END IF;
  END LOOP;

  -- Create order
  INSERT INTO orders (outlet_id, marketing_id, items, total_amount, total_discount, status, shipping_request)
  VALUES (p_outlet_id, v_user_id, p_items, p_total, 0, 'pending', p_shipping_request)
  RETURNING id INTO v_order_id;

  -- Create invoice
  INSERT INTO invoices (order_id, outlet_id, status, amount)
  VALUES (v_order_id, p_outlet_id, 'draft', p_total)
  RETURNING id INTO v_invoice_id;

  -- Create shipment
  INSERT INTO shipments (order_id, status)
  VALUES (v_order_id, 'pending');
  
  -- Note: Stock reduction is handled automatically by trigger 'trg_reduce_stock_on_order'
  -- which fires after this order is inserted

  RETURN QUERY SELECT v_order_id, v_invoice_id, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION create_sales_order_v2 TO authenticated;
