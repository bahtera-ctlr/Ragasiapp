-- Add packing/logistik-in columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS logistik_in_status varchar(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS packing_officer_name varchar(255),
ADD COLUMN IF NOT EXISTS packing_notes text,
ADD COLUMN IF NOT EXISTS packing_verified_by uuid,
ADD COLUMN IF NOT EXISTS packing_verified_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_logistik_in_status ON invoices(logistik_in_status);
