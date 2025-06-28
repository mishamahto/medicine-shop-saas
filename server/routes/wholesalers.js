const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const { search, status } = req.query;
  let query = 'SELECT * FROM wholesalers WHERE 1=1';
  let params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR contact_person LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, wholesalers) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, data: wholesalers });
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM wholesalers WHERE id = ?', [req.params.id], (err, wholesaler) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (!wholesaler) return res.status(404).json({ success: false, message: 'Wholesaler not found' });
    res.json({ success: true, data: wholesaler });
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { name, email, phone, address, contact_person, payment_terms, status } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

  db.run('INSERT INTO wholesalers (name, email, phone, address, contact_person, payment_terms, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, phone, address, contact_person, payment_terms, status || 'active'],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error creating wholesaler' });
      res.json({ success: true, message: 'Wholesaler created successfully', id: this.lastID });
    });
});

router.put('/:id', authenticateToken, (req, res) => {
  const { name, email, phone, address, contact_person, payment_terms, status } = req.body;
  db.run('UPDATE wholesalers SET name = ?, email = ?, phone = ?, address = ?, contact_person = ?, payment_terms = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email, phone, address, contact_person, payment_terms, status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Error updating wholesaler' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Wholesaler not found' });
      res.json({ success: true, message: 'Wholesaler updated successfully' });
    });
});

router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM wholesalers WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Error deleting wholesaler' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Wholesaler not found' });
    res.json({ success: true, message: 'Wholesaler deleted successfully' });
  });
});

module.exports = router; 