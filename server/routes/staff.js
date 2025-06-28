const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const { search, status } = req.query;
  let query = 'SELECT * FROM staff WHERE 1=1';
  let params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, staff) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: staff });
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM staff WHERE id = ?', [req.params.id], (err, staff) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: staff });
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { name, email, phone, position, salary, hire_date, status } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });

  db.run('INSERT INTO staff (name, email, phone, position, salary, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, phone, position, salary, hire_date, status || 'active'],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error creating staff' });
      res.json({ success: true, message: 'Staff created successfully', id: this.lastID });
    });
});

router.put('/:id', authenticateToken, (req, res) => {
  const { name, email, phone, position, salary, hire_date, status } = req.body;
  db.run('UPDATE staff SET name = ?, email = ?, phone = ?, position = ?, salary = ?, hire_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email, phone, position, salary, hire_date, status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error updating staff' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Staff not found' });
      res.json({ success: true, message: 'Staff updated successfully' });
    });
});

router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM staff WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Error deleting staff' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, message: 'Staff deleted successfully' });
  });
});

module.exports = router; 