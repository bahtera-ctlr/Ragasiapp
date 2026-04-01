-- Add shipment tracking columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS shipment_status varchar(50) DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS expedisi_officer_name varchar(255),
ADD COLUMN IF NOT EXISTS shipment_plan text,
ADD COLUMN IF NOT EXISTS shipment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS shipment_verified_by uuid,
ADD COLUMN IF NOT EXISTS shipment_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivery_status varchar(50),
ADD COLUMN IF NOT EXISTS delivery_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivery_notes text;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_shipment_status ON invoices(shipment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_delivery_status ON invoices(delivery_status);
CREATE INDEX IF NOT EXISTS idx_invoices_shipment_date ON invoices(shipment_date);
