const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../database/init');
const router = express.Router();

// Get all bills
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    
    let query = `
      SELECT b.*, c.name as supplier_name 
      FROM bills b 
      LEFT JOIN contacts c ON b.supplier_id = c.id 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (b.bill_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY b.${sortBy} ${sortOrder.toUpperCase()}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ success: false, message: 'Error fetching bills' });
  }
});

// Get single bill
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.*, c.name as supplier_name, c.email as supplier_email 
       FROM bills b 
       LEFT JOIN contacts c ON b.supplier_id = c.id 
       WHERE b.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ success: false, message: 'Error fetching bill' });
  }
});

// Create new bill
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { bill_number, supplier_id, total_amount, status, due_date } = req.body;

    if (!bill_number || !supplier_id) {
      return res.status(400).json({ success: false, message: 'Bill number and supplier are required' });
    }

    const result = await pool.query(
      `INSERT INTO bills (bill_number, supplier_id, total_amount, status, due_date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bill_number, supplier_id, total_amount || 0, status || 'pending', due_date]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ success: false, message: 'Error creating bill' });
  }
});

// Update bill
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bill_number, supplier_id, total_amount, status, due_date } = req.body;

    const result = await pool.query(
      `UPDATE bills 
       SET bill_number = $1, supplier_id = $2, total_amount = $3, 
           status = $4, due_date = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      [bill_number, supplier_id, total_amount, status, due_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ success: false, message: 'Error updating bill' });
  }
});

// Delete bill
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM bills WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ success: false, message: 'Error deleting bill' });
  }
});

module.exports = router; 