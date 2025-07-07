-- Drop the existing invoice_items table if it exists
DROP TABLE IF EXISTS invoice_items CASCADE;

-- Create invoice_items table
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    inventory_id INTEGER REFERENCES inventory(id),
    item_text TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Make inventory_id optional since we can have custom items
ALTER TABLE invoice_items
ALTER COLUMN inventory_id DROP NOT NULL; 