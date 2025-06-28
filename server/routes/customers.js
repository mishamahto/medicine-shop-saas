const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const { search, type } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  let params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (type) {
    query += ' AND customer_type = ?';
    params.push(type);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, customers) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: customers });
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM customers WHERE id = ?', [req.params.id], (err, customer) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { name, email, phone, address, customer_type } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

  db.run('INSERT INTO customers (name, email, phone, address, customer_type) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, address, customer_type || 'retail'],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error creating customer' });
      res.json({ success: true, message: 'Customer created successfully', id: this.lastID });
    });
});

router.put('/:id', authenticateToken, (req, res) => {
  const { name, email, phone, address, customer_type } = req.body;
  db.run('UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, customer_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email, phone, address, customer_type, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error updating customer' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, message: 'Customer updated successfully' });
    });
});

router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Error deleting customer' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted successfully' });
  });
});

module.exports = router; 