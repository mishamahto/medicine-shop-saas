const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, (req, res) => {
  const { search, category, status, lowStock } = req.query;
  let query = `
    SELECT i.*, c.name as category_name 
    FROM inventory i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE 1=1
  `;
  let params = [];

  if (search) {
    query += ` AND (i.name LIKE ? OR i.generic_name LIKE ? OR i.barcode LIKE ? OR i.sku LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (category) {
    query += ` AND i.category_id = ?`;
    params.push(category);
  }

  if (status) {
    query += ` AND i.status = ?`;
    params.push(status);
  }

  if (lowStock === 'true') {
    query += ` AND i.quantity <= i.reorder_level`;
  }

  query += ` ORDER BY i.name ASC`;

  db.all(query, params, (err, items) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: items });
  });
});

// Get single inventory item
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT i.*, c.name as category_name 
    FROM inventory i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE i.id = ?
  `, [id], (err, item) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ success: true, data: item });
  });
});

// Create new inventory item
router.post('/', authenticateToken, (req, res) => {
  const {
    name,
    generic_name,
    category_id,
    manufacturer,
    strength,
    dosage_form,
    pack_size,
    barcode,
    sku,
    cost_price,
    selling_price,
    quantity,
    reorder_level,
    expiry_date,
    location
  } = req.body;

  if (!name || !cost_price || !selling_price) {
    return res.status(400).json({ success: false, message: 'Name, cost price, and selling price are required' });
  }

  // Generate SKU if not provided
  const finalSku = sku || `SKU-${uuidv4().substring(0, 8).toUpperCase()}`;

  console.log('Creating inventory item with data:', {
    name, generic_name, category_id, manufacturer, strength,
    dosage_form, pack_size, barcode, finalSku, cost_price,
    selling_price, quantity, reorder_level, expiry_date, location
  });

  db.run(`
    INSERT INTO inventory (
      name, generic_name, category_id, manufacturer, strength, 
      dosage_form, pack_size, barcode, sku, cost_price, 
      selling_price, quantity, reorder_level, expiry_date, location
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name, generic_name, category_id, manufacturer, strength,
    dosage_form, pack_size, barcode, finalSku, cost_price,
    selling_price, quantity || 0, reorder_level || 10, expiry_date, location
  ], function(err) {
    if (err) {
      console.error('Database error creating inventory item:', err);
      return res.status(500).json({ success: false, message: 'Error creating inventory item', error: err.message });
    }

    res.json({
      success: true,
      message: 'Inventory item created successfully',
      id: this.lastID
    });
  });
});

// Update inventory item
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    name,
    generic_name,
    category_id,
    manufacturer,
    strength,
    dosage_form,
    pack_size,
    barcode,
    sku,
    cost_price,
    selling_price,
    quantity,
    reorder_level,
    expiry_date,
    location,
    status
  } = req.body;

  db.run(`
    UPDATE inventory SET 
      name = ?, generic_name = ?, category_id = ?, manufacturer = ?, 
      strength = ?, dosage_form = ?, pack_size = ?, barcode = ?, 
      sku = ?, cost_price = ?, selling_price = ?, quantity = ?, 
      reorder_level = ?, expiry_date = ?, location = ?, status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    name, generic_name, category_id, manufacturer, strength,
    dosage_form, pack_size, barcode, sku, cost_price,
    selling_price, quantity, reorder_level, expiry_date, location, status, id
  ], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error updating inventory item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Inventory item updated successfully' });
  });
});

// Delete inventory item
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting inventory item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  });
});

// Update stock quantity
router.patch('/:id/stock', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { quantity, type } = req.body; // type: 'add' or 'subtract'

  if (!quantity || !type) {
    return res.status(400).json({ success: false, message: 'Quantity and type are required' });
  }

  db.get('SELECT quantity FROM inventory WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    let newQuantity;
    if (type === 'add') {
      newQuantity = item.quantity + parseInt(quantity);
    } else if (type === 'subtract') {
      newQuantity = item.quantity - parseInt(quantity);
      if (newQuantity < 0) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid type. Use "add" or "subtract"' });
    }

    db.run(
      'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newQuantity, id],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error updating stock' });
        }

        res.json({
          success: true,
          message: 'Stock updated successfully',
          newQuantity
        });
      }
    );
  });
});

// Get low stock items
router.get('/low-stock/items', authenticateToken, (req, res) => {
  db.all(`
    SELECT i.*, c.name as category_name 
    FROM inventory i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE i.quantity <= i.reorder_level AND i.status = 'active'
    ORDER BY i.quantity ASC
  `, (err, items) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: items });
  });
});

// Get expiring items
router.get('/expiring/items', authenticateToken, (req, res) => {
  const { days = 30 } = req.query;
  
  db.all(`
    SELECT i.*, c.name as category_name,
           julianday(i.expiry_date) - julianday('now') as days_until_expiry
    FROM inventory i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE i.expiry_date IS NOT NULL 
      AND i.expiry_date <= date('now', '+' || ? || ' days')
      AND i.status = 'active'
    ORDER BY i.expiry_date ASC
  `, [days], (err, items) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: items });
  });
});

module.exports = router; 