const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../database/init');
const router = express.Router();

// Get all invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    
    let query = `
      SELECT i.*, c.name as customer_name 
      FROM invoices i 
      LEFT JOIN contacts c ON i.customer_id = c.id 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (i.invoice_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY i.${sortBy} ${sortOrder.toUpperCase()}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoices' });
  }
});

// Get single invoice
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, c.name as customer_name, c.email as customer_email 
       FROM invoices i 
       LEFT JOIN contacts c ON i.customer_id = c.id 
       WHERE i.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Error fetching invoice' });
  }
});

// Create new invoice
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { invoice_number, customer_id, total_amount, status, due_date } = req.body;

    if (!invoice_number || !customer_id) {
      return res.status(400).json({ success: false, message: 'Invoice number and customer are required' });
    }

    const result = await pool.query(
      `INSERT INTO invoices (invoice_number, customer_id, total_amount, status, due_date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [invoice_number, customer_id, total_amount || 0, status || 'pending', due_date]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Error creating invoice' });
  }
});

// Update invoice
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_number, customer_id, total_amount, status, due_date } = req.body;

    const result = await pool.query(
      `UPDATE invoices 
       SET invoice_number = $1, customer_id = $2, total_amount = $3, 
           status = $4, due_date = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      [invoice_number, customer_id, total_amount, status, due_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: 'Error updating invoice' });
  }
});

// Delete invoice
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, message: 'Error deleting invoice' });
  }
});

module.exports = router; 