-- Add shipping request column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_request VARCHAR(20) DEFAULT 'REGULER'
CHECK (shipping_request IN ('OTS', 'REGULER', 'EXPRESS'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_shipping_request ON orders(shipping_request);

-- Update existing orders to have default value if null
UPDATE orders SET shipping_request = 'REGULER' WHERE shipping_request IS NULL;