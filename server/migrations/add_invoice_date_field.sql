-- Add invoice_date column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP; 