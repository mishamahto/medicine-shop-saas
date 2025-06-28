const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get all bills
router.get('/', authenticateToken, (req, res) => {
  const { status, category, startDate, endDate } = req.query;
  let query = `
    SELECT b.*, u.username as created_by_name
    FROM bills b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE 1=1
  `;
  let params = [];

  if (status) {
    query += ` AND b.payment_status = ?`;
    params.push(status);
  }

  if (category) {
    query += ` AND b.category = ?`;
    params.push(category);
  }

  if (startDate) {
    query += ` AND b.bill_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND b.bill_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY b.bill_date DESC`;

  db.all(query, params, (err, bills) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: bills });
  });
});

// Get single bill
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(`
    SELECT b.*, u.username as created_by_name
    FROM bills b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `, [id], (err, bill) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, data: bill });
  });
});

// Create new bill
router.post('/', authenticateToken, (req, res) => {
  const {
    bill_date,
    vendor_name,
    category,
    description,
    amount,
    payment_method,
    due_date,
    notes
  } = req.body;

  if (!bill_date || !amount) {
    return res.status(400).json({ success: false, message: 'Bill date and amount are required' });
  }

  const bill_number = `BILL-${Date.now()}-${uuidv4().substring(0, 4).toUpperCase()}`;

  db.run(`
    INSERT INTO bills (
      bill_number, bill_date, vendor_name, category, description,
      amount, payment_method, due_date, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bill_number, bill_date, vendor_name, category, description,
    amount, payment_method, due_date, notes, req.user.id
  ], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error creating bill' });
    }

    res.json({
      success: true,
      message: 'Bill created successfully',
      id: this.lastID,
      bill_number
    });
  });
});

// Update bill
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    bill_date,
    vendor_name,
    category,
    description,
    amount,
    payment_status,
    payment_method,
    due_date,
    notes
  } = req.body;

  db.run(`
    UPDATE bills SET 
      bill_date = ?, vendor_name = ?, category = ?, description = ?,
      amount = ?, payment_status = ?, payment_method = ?, due_date = ?, notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    bill_date, vendor_name, category, description,
    amount, payment_status, payment_method, due_date, notes, id
  ], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error updating bill' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, message: 'Bill updated successfully' });
  });
});

// Delete bill
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM bills WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting bill' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, message: 'Bill deleted successfully' });
  });
});

// Get bill statistics
router.get('/stats/summary', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  let dateFilter = '';
  let params = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE bill_date BETWEEN ? AND ?';
    params = [startDate, endDate];
  }

  db.get(`
    SELECT 
      COUNT(*) as total_bills,
      SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_bills,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_bills,
      SUM(amount) as total_amount,
      SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as paid_amount
    FROM bills
    ${dateFilter}
  `, params, (err, stats) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: stats });
  });
});

module.exports = router; 