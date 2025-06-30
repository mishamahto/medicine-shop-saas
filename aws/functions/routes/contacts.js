const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../database/init');
const router = express.Router();

// Get all contacts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, search, sortBy = 'name', sortOrder = 'ASC' } = req.query;
    
    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ success: false, message: 'Error fetching contacts' });
  }
});

// Get single contact
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ success: false, message: 'Error fetching contact' });
  }
});

// Create new contact
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Name and type are required' });
    }

    if (!['customer', 'wholesaler', 'staff'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be customer, wholesaler, or staff' });
    }

    const result = await pool.query(
      `INSERT INTO contacts (name, email, phone, address, type) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, phone, address, type]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ success: false, message: 'Error creating contact' });
  }
});

// Update contact
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, type } = req.body;

    const result = await pool.query(
      `UPDATE contacts 
       SET name = $1, email = $2, phone = $3, address = $4, type = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      [name, email, phone, address, type, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ success: false, message: 'Error updating contact' });
  }
});

// Delete contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ success: false, message: 'Error deleting contact' });
  }
});

// Get contacts by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const result = await pool.query(
      'SELECT * FROM contacts WHERE type = $1 ORDER BY name',
      [type]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get contacts by type error:', error);
    res.status(500).json({ success: false, message: 'Error fetching contacts' });
  }
});

module.exports = router; 