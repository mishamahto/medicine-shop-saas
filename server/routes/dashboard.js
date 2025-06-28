const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  let dateFilter = '';
  let params = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE created_at BETWEEN ? AND ?';
    params = [startDate, endDate];
  }

  // Get inventory stats
  db.get(`
    SELECT 
      COUNT(*) as total_items,
      SUM(quantity) as total_stock,
      SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END) as low_stock_items,
      SUM(CASE WHEN expiry_date <= date('now', '+30 days') THEN 1 ELSE 0 END) as expiring_items
    FROM inventory
    WHERE status = 'active'
  `, (err, inventoryStats) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });

    // Get sales stats
    db.get(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
      FROM invoices
      ${dateFilter}
    `, params, (err, salesStats) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });

      // Get purchase order stats
      db.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_purchases,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders
        FROM purchase_orders
        ${dateFilter}
      `, params, (err, purchaseStats) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });

        // Get customer stats
        db.get('SELECT COUNT(*) as total_customers FROM customers', (err, customerStats) => {
          if (err) return res.status(500).json({ success: false, message: 'Database error' });

          res.json({
            success: true,
            data: {
              inventory: inventoryStats,
              sales: salesStats,
              purchases: purchaseStats,
              customers: customerStats
            }
          });
        });
      });
    });
  });
});

// Get recent activity
router.get('/recent-activity', authenticateToken, (req, res) => {
  const activities = [];
  
  // Get recent invoices
  db.all(`
    SELECT 'invoice' as type, invoice_number as number, total_amount as amount, invoice_date as date, 'Invoice created' as description
    FROM invoices 
    ORDER BY created_at DESC 
    LIMIT 5
  `, (err, invoices) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    activities.push(...invoices);

    // Get recent purchase orders
    db.all(`
      SELECT 'purchase_order' as type, po_number as number, total_amount as amount, order_date as date, 'Purchase order created' as description
      FROM purchase_orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `, (err, orders) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      activities.push(...orders);

      // Sort by date and return top 10
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json({ success: true, data: activities.slice(0, 10) });
    });
  });
});

module.exports = router; 