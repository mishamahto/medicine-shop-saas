-- Add customer text fields to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Make customer_id optional (nullable)
ALTER TABLE invoices
ALTER COLUMN customer_id DROP NOT NULL; 