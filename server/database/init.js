const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use PostgreSQL in production, SQLite in development
const isProduction = process.env.NODE_ENV === 'production';

let db;
let pool;

if (isProduction) {
  // PostgreSQL for production (GCP Cloud SQL)
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test the connection
  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
} else {
  // SQLite for development
  const dbPath = path.join(__dirname, 'medicine_shop.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
    }
  });
}

// Initialize database tables
const initDatabase = async () => {
  try {
    if (isProduction) {
      // PostgreSQL initialization
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS inventory (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          quantity INTEGER DEFAULT 0,
          unit_price DECIMAL(10,2) DEFAULT 0.00,
          supplier VARCHAR(255),
          expiry_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          invoice_number VARCHAR(100) UNIQUE NOT NULL,
          customer_id INTEGER REFERENCES contacts(id),
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          status VARCHAR(50) DEFAULT 'pending',
          due_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS bills (
          id SERIAL PRIMARY KEY,
          bill_number VARCHAR(100) UNIQUE NOT NULL,
          supplier_id INTEGER REFERENCES contacts(id),
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          status VARCHAR(50) DEFAULT 'pending',
          due_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchase_orders (
          id SERIAL PRIMARY KEY,
          po_number VARCHAR(100) UNIQUE NOT NULL,
          supplier_id INTEGER REFERENCES contacts(id),
          total_amount DECIMAL(10,2) DEFAULT 0.00,
          status VARCHAR(50) DEFAULT 'pending',
          expected_delivery DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('PostgreSQL database tables initialized successfully');
    } else {
      // SQLite initialization (existing code)
      db.serialize(() => {
        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create inventory table
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          quantity INTEGER DEFAULT 0,
          unit_price REAL DEFAULT 0.00,
          supplier TEXT,
          expiry_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create contacts table
        db.run(`CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create invoices table
        db.run(`CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER,
          total_amount REAL DEFAULT 0.00,
          status TEXT DEFAULT 'pending',
          due_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES contacts (id)
        )`);

        // Create bills table
        db.run(`CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_number TEXT UNIQUE NOT NULL,
          supplier_id INTEGER,
          total_amount REAL DEFAULT 0.00,
          status TEXT DEFAULT 'pending',
          due_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (supplier_id) REFERENCES contacts (id)
        )`);

        // Create purchase orders table
        db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          po_number TEXT UNIQUE NOT NULL,
          supplier_id INTEGER,
          total_amount REAL DEFAULT 0.00,
          status TEXT DEFAULT 'pending',
          expected_delivery DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (supplier_id) REFERENCES contacts (id)
        )`);

        console.log('SQLite database tables initialized successfully');
      });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Initialize database on module load
initDatabase().catch(console.error);

// Export the appropriate database interface
if (isProduction) {
  module.exports = { pool, initDatabase };
} else {
  module.exports = { db, initDatabase };
} 