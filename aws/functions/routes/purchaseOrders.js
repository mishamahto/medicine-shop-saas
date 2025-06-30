const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../database/init');
const router = express.Router();

// Get all purchase orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    
    let query = `
      SELECT po.*, c.name as supplier_name 
      FROM purchase_orders po 
      LEFT JOIN contacts c ON po.supplier_id = c.id 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND po.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (po.po_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY po.${sortBy} ${sortOrder.toUpperCase()}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching purchase orders' });
  }
});

// Get single purchase order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT po.*, c.name as supplier_name, c.email as supplier_email 
       FROM purchase_orders po 
       LEFT JOIN contacts c ON po.supplier_id = c.id 
       WHERE po.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ success: false, message: 'Error fetching purchase order' });
  }
});

// Create new purchase order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { po_number, supplier_id, total_amount, status, expected_delivery } = req.body;

    if (!po_number || !supplier_id) {
      return res.status(400).json({ success: false, message: 'PO number and supplier are required' });
    }

    const result = await pool.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, total_amount, status, expected_delivery) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [po_number, supplier_id, total_amount || 0, status || 'pending', expected_delivery]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ success: false, message: 'Error creating purchase order' });
  }
});

// Update purchase order
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { po_number, supplier_id, total_amount, status, expected_delivery } = req.body;

    const result = await pool.query(
      `UPDATE purchase_orders 
       SET po_number = $1, supplier_id = $2, total_amount = $3, 
           status = $4, expected_delivery = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      [po_number, supplier_id, total_amount, status, expected_delivery, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ success: false, message: 'Error updating purchase order' });
  }
});

// Delete purchase order
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM purchase_orders WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({ success: false, message: 'Error deleting purchase order' });
  }
});

module.exports = router; 