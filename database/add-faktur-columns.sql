-- Add faktur/invoice management columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS faktur_status varchar(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS faktur_officer_name varchar(255),
ADD COLUMN IF NOT EXISTS faktur_notes text,
ADD COLUMN IF NOT EXISTS faktur_verified_by uuid,
ADD COLUMN IF NOT EXISTS faktur_verified_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_faktur_status ON invoices(faktur_status);
