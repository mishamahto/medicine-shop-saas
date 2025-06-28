const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const router = express.Router();

// Get all categories
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name ASC', (err, categories) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: categories });
  });
});

// Get single category
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM categories WHERE id = ?', [req.params.id], (err, category) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  });
});

// Create new category
router.post('/', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  db.run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error creating category' });
    }
    res.json({
      success: true,
      message: 'Category created successfully',
      id: this.lastID
    });
  });
});

// Update category
router.put('/:id', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  db.run('UPDATE categories SET name = ?, description = ? WHERE id = ?', 
    [name, description, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error updating category' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category updated successfully' });
  });
});

// Delete category
router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting category' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted successfully' });
  });
});

module.exports = router; 