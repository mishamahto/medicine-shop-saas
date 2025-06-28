const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get all invoices
router.get('/', authenticateToken, (req, res) => {
  const { status, customer, startDate, endDate } = req.query;
  let query = `
    SELECT inv.*, c.name as customer_name, c.phone as customer_phone, u.username as created_by_name
    FROM invoices inv
    LEFT JOIN customers c ON inv.customer_id = c.id
    LEFT JOIN users u ON inv.created_by = u.id
    WHERE 1=1
  `;
  let params = [];

  if (status) {
    query += ` AND inv.status = ?`;
    params.push(status);
  }

  if (customer) {
    query += ` AND inv.customer_id = ?`;
    params.push(customer);
  }

  if (startDate) {
    query += ` AND inv.invoice_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND inv.invoice_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY inv.invoice_date DESC`;

  db.all(query, params, (err, invoices) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: invoices });
  });
});

// Get single invoice with items
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Get invoice details
  db.get(`
    SELECT inv.*, c.name as customer_name, c.email as customer_email, 
           c.phone as customer_phone, c.address as customer_address, u.username as created_by_name
    FROM invoices inv
    LEFT JOIN customers c ON inv.customer_id = c.id
    LEFT JOIN users u ON inv.created_by = u.id
    WHERE inv.id = ?
  `, [id], (err, invoice) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Get invoice items
    db.all(`
      SELECT ii.*, i.name as item_name, i.sku, i.barcode, i.cost_price
      FROM invoice_items ii
      LEFT JOIN inventory i ON ii.inventory_id = i.id
      WHERE ii.invoice_id = ?
    `, [id], (err, items) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      res.json({
        success: true,
        data: {
          ...invoice,
          items
        }
      });
    });
  });
});

// Create new invoice
router.post('/', authenticateToken, (req, res) => {
  const {
    customer_id,
    invoice_date,
    due_date,
    items,
    tax_amount = 0,
    discount_amount = 0,
    payment_method,
    notes
  } = req.body;

  if (!customer_id || !invoice_date || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Customer, invoice date, and items are required' });
  }

  const invoice_number = `INV-${Date.now()}-${uuidv4().substring(0, 4).toUpperCase()}`;
  let subtotal = 0;

  // Calculate subtotal
  items.forEach(item => {
    subtotal += item.quantity * item.unit_price;
  });

  const total_amount = subtotal + tax_amount - discount_amount;

  db.run(`
    INSERT INTO invoices (
      invoice_number, customer_id, invoice_date, due_date, subtotal,
      tax_amount, discount_amount, total_amount, payment_method, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    invoice_number, customer_id, invoice_date, due_date, subtotal,
    tax_amount, discount_amount, total_amount, payment_method, notes, req.user.id
  ], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error creating invoice' });
    }

    const invoice_id = this.lastID;

    // Insert invoice items and update inventory
    const insertItems = items.map(item => {
      return new Promise((resolve, reject) => {
        // Check if sufficient stock
        db.get('SELECT quantity FROM inventory WHERE id = ?', [item.inventory_id], (err, inventory) => {
          if (err) {
            reject(err);
            return;
          }

          if (!inventory || inventory.quantity < item.quantity) {
            reject(new Error(`Insufficient stock for item ${item.inventory_id}`));
            return;
          }

          // Insert invoice item
          db.run(`
            INSERT INTO invoice_items (
              invoice_id, inventory_id, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            invoice_id,
            item.inventory_id,
            item.quantity,
            item.unit_price,
            item.quantity * item.unit_price
          ], function(err) {
            if (err) {
              reject(err);
              return;
            }

            // Update inventory quantity
            db.run(`
              UPDATE inventory 
              SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `, [item.quantity, item.inventory_id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      });
    });

    Promise.all(insertItems)
      .then(() => {
        // Update customer total purchases
        db.run(`
          UPDATE customers 
          SET total_purchases = total_purchases + ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [total_amount, customer_id]);

        res.json({
          success: true,
          message: 'Invoice created successfully',
          id: invoice_id,
          invoice_number
        });
      })
      .catch(err => {
        res.status(500).json({ success: false, message: err.message });
      });
  });
});

// Update invoice status
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const validStatuses = ['pending', 'paid', 'cancelled', 'overdue'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  db.run(
    'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error updating status' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }

      res.json({ success: true, message: 'Status updated successfully' });
    }
  );
});

// Mark invoice as paid
router.post('/:id/pay', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { payment_method, payment_date } = req.body;

  db.run(`
    UPDATE invoices 
    SET status = 'paid', payment_method = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [payment_method, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error updating payment status' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, message: 'Invoice marked as paid successfully' });
  });
});

// Delete invoice
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // First, restore inventory quantities
  db.all('SELECT inventory_id, quantity FROM invoice_items WHERE invoice_id = ?', [id], (err, items) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error retrieving invoice items' });
    }

    // Restore inventory
    items.forEach(item => {
      db.run(`
        UPDATE inventory 
        SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [item.quantity, item.inventory_id]);
    });

    // Delete invoice items
    db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error deleting invoice items' });
      }

      // Delete invoice
      db.run('DELETE FROM invoices WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error deleting invoice' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        res.json({ success: true, message: 'Invoice deleted successfully' });
      });
    });
  });
});

// Get invoice statistics
router.get('/stats/summary', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  let dateFilter = '';
  let params = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE invoice_date BETWEEN ? AND ?';
    params = [startDate, endDate];
  }

  db.get(`
    SELECT 
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_invoices,
      SUM(total_amount) as total_revenue,
      SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
    FROM invoices
    ${dateFilter}
  `, params, (err, stats) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, data: stats });
  });
});

module.exports = router; 