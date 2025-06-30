const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../database/init');
const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category, sortBy = 'name', sortOrder = 'ASC' } = req.query;
    
    let query = 'SELECT * FROM inventory WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: 'Error fetching inventory' });
  }
});

// Get single inventory item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ success: false, message: 'Error fetching item' });
  }
});

// Create new inventory item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, category, quantity, unit_price, supplier, expiry_date } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO inventory (name, description, category, quantity, unit_price, supplier, expiry_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, category, quantity || 0, unit_price || 0, supplier, expiry_date]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ success: false, message: 'Error creating item' });
  }
});

// Update inventory item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, quantity, unit_price, supplier, expiry_date } = req.body;

    const result = await pool.query(
      `UPDATE inventory 
       SET name = $1, description = $2, category = $3, quantity = $4, 
           unit_price = $5, supplier = $6, expiry_date = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`,
      [name, description, category, quantity, unit_price, supplier, expiry_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, message: 'Error updating item' });
  }
});

// Delete inventory item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ success: false, message: 'Error deleting item' });
  }
});

// Get inventory categories
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL ORDER BY category');
    const categories = result.rows.map(row => row.category);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
});

// Get low stock items
router.get('/low-stock/threshold', authenticateToken, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const result = await pool.query(
      'SELECT * FROM inventory WHERE quantity <= $1 ORDER BY quantity ASC',
      [threshold]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ success: false, message: 'Error fetching low stock items' });
  }
});

module.exports = router; 