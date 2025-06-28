const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get all purchase orders
router.get('/', authenticateToken, (req, res) => {
  const { status, wholesaler, startDate, endDate } = req.query;
  let query = `
    SELECT po.*, w.name as wholesaler_name, u.username as created_by_name
    FROM purchase_orders po
    LEFT JOIN wholesalers w ON po.wholesaler_id = w.id
    LEFT JOIN users u ON po.created_by = u.id
    WHERE 1=1
  `;
  let params = [];

  if (status) {
    query += ` AND po.status = ?`;
    params.push(status);
  }

  if (wholesaler) {
    query += ` AND po.wholesaler_id = ?`;
    params.push(wholesaler);
  }

  if (startDate) {
    query += ` AND po.order_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND po.order_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY po.order_date DESC`;

  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: orders });
  });
});

// Get single purchase order with items
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Get purchase order details
  db.get(`
    SELECT po.*, w.name as wholesaler_name, w.email as wholesaler_email, 
           w.phone as wholesaler_phone, u.username as created_by_name
    FROM purchase_orders po
    LEFT JOIN wholesalers w ON po.wholesaler_id = w.id
    LEFT JOIN users u ON po.created_by = u.id
    WHERE po.id = ?
  `, [id], (err, order) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    // Get purchase order items
    db.all(`
      SELECT poi.*, i.name as item_name, i.sku, i.barcode, i.selling_price
      FROM purchase_order_items poi
      LEFT JOIN inventory i ON poi.inventory_id = i.id
      WHERE poi.purchase_order_id = ?
    `, [id], (err, items) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      res.json({
        success: true,
        data: {
          ...order,
          items
        }
      });
    });
  });
});

// Create new purchase order
router.post('/', authenticateToken, (req, res) => {
  const {
    wholesaler_id,
    order_date,
    expected_delivery,
    notes,
    items
  } = req.body;

  if (!wholesaler_id || !order_date || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Wholesaler, order date, and items are required' });
  }

  const po_number = `PO-${Date.now()}-${uuidv4().substring(0, 4).toUpperCase()}`;
  let total_amount = 0;

  // Calculate total amount
  items.forEach(item => {
    total_amount += item.quantity * item.unit_cost;
  });

  db.run(`
    INSERT INTO purchase_orders (
      po_number, wholesaler_id, order_date, expected_delivery, 
      total_amount, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [po_number, wholesaler_id, order_date, expected_delivery, total_amount, notes, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error creating purchase order' });
    }

    const purchase_order_id = this.lastID;

    // Insert purchase order items
    const insertItems = items.map(item => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO purchase_order_items (
            purchase_order_id, inventory_id, quantity, unit_cost, total_cost
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          purchase_order_id,
          item.inventory_id,
          item.quantity,
          item.unit_cost,
          item.quantity * item.unit_cost
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    Promise.all(insertItems)
      .then(() => {
        res.json({
          success: true,
          message: 'Purchase order created successfully',
          id: purchase_order_id,
          po_number
        });
      })
      .catch(err => {
        res.status(500).json({ success: false, message: 'Error creating purchase order items' });
      });
  });
});

// Update purchase order status
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const validStatuses = ['pending', 'confirmed', 'shipped', 'received', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  db.run(
    'UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error updating status' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Purchase order not found' });
      }

      res.json({ success: true, message: 'Status updated successfully' });
    }
  );
});

// Receive items from purchase order
router.post('/:id/receive', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { received_items } = req.body; // Array of {item_id, received_quantity}

  if (!received_items || received_items.length === 0) {
    return res.status(400).json({ success: false, message: 'Received items are required' });
  }

  db.serialize(() => {
    // Update purchase order status to received
    db.run(
      'UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['received', id]
    );

    // Update received quantities and inventory
    received_items.forEach(item => {
      // Update purchase order item received quantity
      db.run(`
        UPDATE purchase_order_items 
        SET received_quantity = received_quantity + ? 
        WHERE purchase_order_id = ? AND inventory_id = ?
      `, [item.received_quantity, id, item.item_id]);

      // Update inventory quantity
      db.run(`
        UPDATE inventory 
        SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [item.received_quantity, item.item_id]);
    });

    res.json({ success: true, message: 'Items received successfully' });
  });
});

// Delete purchase order
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error deleting purchase order items' });
    }

    db.run('DELETE FROM purchase_orders WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error deleting purchase order' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Purchase order not found' });
      }

      res.json({ success: true, message: 'Purchase order deleted successfully' });
    });
  });
});

// Get purchase order statistics
router.get('/stats/summary', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  let dateFilter = '';
  let params = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE order_date BETWEEN ? AND ?';
    params = [startDate, endDate];
  }

  db.get(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
      SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received_orders,
      SUM(total_amount) as total_value
    FROM purchase_orders
    ${dateFilter}
  `, params, (err, stats) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: stats });
  });
});

module.exports = router; 