-- Add medicine-specific fields to inventory table
ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
    ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(100),
    ADD COLUMN IF NOT EXISTS strength VARCHAR(100),
    ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(255),
    ADD COLUMN IF NOT EXISTS prescription_required BOOLEAN DEFAULT false;