-- Add outlet_name column to invoice_history table
ALTER TABLE invoice_history
ADD COLUMN outlet_name TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_history_outlet_name ON invoice_history(outlet_name);

-- Comment for documentation
COMMENT ON COLUMN invoice_history.outlet_name IS 'Nama outlet dari CSV, tidak perlu fetch dari tabel outlets';
