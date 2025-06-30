const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../database/init');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get total inventory items
    const inventoryResult = await pool.query('SELECT COUNT(*) as total FROM inventory');
    const totalInventory = parseInt(inventoryResult.rows[0].total);

    // Get total inventory value
    const valueResult = await pool.query('SELECT SUM(quantity * unit_price) as total_value FROM inventory');
    const totalValue = parseFloat(valueResult.rows[0].total_value || 0);

    // Get low stock items (quantity <= 10)
    const lowStockResult = await pool.query('SELECT COUNT(*) as count FROM inventory WHERE quantity <= 10');
    const lowStockCount = parseInt(lowStockResult.rows[0].count);

    // Get total contacts
    const contactsResult = await pool.query('SELECT COUNT(*) as total FROM contacts');
    const totalContacts = parseInt(contactsResult.rows[0].total);

    // Get contacts by type
    const contactsByTypeResult = await pool.query(
      'SELECT type, COUNT(*) as count FROM contacts GROUP BY type'
    );
    const contactsByType = contactsByTypeResult.rows.reduce((acc, row) => {
      acc[row.type] = parseInt(row.count);
      return acc;
    }, {});

    // Get recent inventory items
    const recentInventoryResult = await pool.query(
      'SELECT * FROM inventory ORDER BY created_at DESC LIMIT 5'
    );

    // Get expiring items (within 30 days)
    const expiringResult = await pool.query(
      'SELECT COUNT(*) as count FROM inventory WHERE expiry_date <= CURRENT_DATE + INTERVAL \'30 days\' AND expiry_date >= CURRENT_DATE'
    );
    const expiringCount = parseInt(expiringResult.rows[0].count);

    res.json({
      success: true,
      data: {
        inventory: {
          total: totalInventory,
          totalValue: totalValue,
          lowStock: lowStockCount,
          expiring: expiringCount
        },
        contacts: {
          total: totalContacts,
          byType: contactsByType
        },
        recentInventory: recentInventoryResult.rows
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard statistics' });
  }
});

module.exports = router; 