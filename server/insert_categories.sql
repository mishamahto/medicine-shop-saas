-- SQL Insert Queries for Categories Table
-- Medicine Shop SaaS - Categories Data

-- Clear existing categories (optional - uncomment if you want to reset)
-- DELETE FROM categories;

-- Insert common medicine categories
INSERT INTO categories (name, description) VALUES
('Pain Relief', 'Medications for pain management and relief'),
('Antibiotics', 'Medications to treat bacterial infections'),
('Antiviral', 'Medications to treat viral infections'),
('Cardiovascular', 'Medications for heart and blood vessel conditions'),
('Diabetes', 'Medications for diabetes management'),
('Respiratory', 'Medications for breathing and lung conditions'),
('Gastrointestinal', 'Medications for digestive system issues'),
('Mental Health', 'Medications for psychiatric and mental health conditions'),
('Vitamins & Supplements', 'Nutritional supplements and vitamins'),
('First Aid', 'Basic first aid supplies and medications'),
('Dermatological', 'Medications for skin conditions'),
('Ophthalmic', 'Eye care medications and treatments'),
('Dental Care', 'Oral health medications and supplies'),
('Women''s Health', 'Medications specific to women''s health'),
('Men''s Health', 'Medications specific to men''s health'),
('Pediatric', 'Medications specifically for children'),
('Geriatric', 'Medications for elderly patients'),
('Emergency', 'Emergency medications and supplies'),
('Chronic Disease', 'Medications for long-term chronic conditions'),
('Over-the-Counter', 'Non-prescription medications and remedies');

-- Verify the insertions
SELECT id, name, description, created_at FROM categories ORDER BY id; 