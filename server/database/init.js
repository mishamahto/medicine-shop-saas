const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database file in a writable location
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/medicine_shop.db'  // Use /tmp for Vercel serverless
  : path.join(__dirname, 'medicine_shop.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table (for authentication)
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Staff table
      db.run(`CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        position TEXT,
        salary REAL,
        hire_date DATE,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Customers table
      db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        customer_type TEXT DEFAULT 'retail',
        total_purchases REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Wholesalers table
      db.run(`CREATE TABLE IF NOT EXISTS wholesalers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        contact_person TEXT,
        payment_terms TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Categories table
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Inventory table
      db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        generic_name TEXT,
        category_id INTEGER,
        manufacturer TEXT,
        strength TEXT,
        dosage_form TEXT,
        pack_size TEXT,
        barcode TEXT UNIQUE,
        sku TEXT UNIQUE,
        cost_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        quantity INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        expiry_date DATE,
        location TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`);

      // Purchase Orders table
      db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT UNIQUE NOT NULL,
        wholesaler_id INTEGER,
        order_date DATE NOT NULL,
        expected_delivery DATE,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wholesaler_id) REFERENCES wholesalers (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      // Purchase Order Items table
      db.run(`CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_order_id INTEGER,
        inventory_id INTEGER,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        received_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id),
        FOREIGN KEY (inventory_id) REFERENCES inventory (id)
      )`);

      // Invoices table
      db.run(`CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        invoice_date DATE NOT NULL,
        due_date DATE,
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      // Invoice Items table
      db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        inventory_id INTEGER,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id),
        FOREIGN KEY (inventory_id) REFERENCES inventory (id)
      )`);

      // Bills table (daily expenses)
      db.run(`CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_number TEXT UNIQUE NOT NULL,
        bill_date DATE NOT NULL,
        vendor_name TEXT,
        category TEXT,
        description TEXT,
        amount REAL NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT,
        due_date DATE,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      // Sales table (for tracking daily sales)
      db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        customer_id INTEGER,
        sale_date DATE NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      // Insert default categories
      const defaultCategories = [
        'Antibiotics',
        'Pain Relief',
        'Vitamins & Supplements',
        'Diabetes',
        'Cardiovascular',
        'Respiratory',
        'Dermatology',
        'Gastrointestinal',
        'Neurology',
        'Oncology',
        'Other'
      ];

      // Clean up duplicate categories first
      db.run(`DELETE FROM categories WHERE id NOT IN (
        SELECT MIN(id) FROM categories GROUP BY name
      )`);

      defaultCategories.forEach(category => {
        db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
      });

      // Create default admin user
      const defaultPassword = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
              VALUES (?, ?, ?, ?)`, 
              ['admin', 'admin@medicineshop.com', defaultPassword, 'admin']);

      console.log('Database initialized successfully');
      resolve();
    });
  });
};

// Initialize database on module load
initDatabase().catch(console.error);

module.exports = db; 