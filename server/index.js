const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

console.log('Starting server initialization...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Database host:', process.env.DB_HOST);

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database initialization
console.log('Loading database module...');
const db = require('./database/init');

// Initialize database before starting server
const startServer = async () => {
  try {
    console.log('Initializing database...');
    await db.initDatabase();
    console.log('Database initialized successfully');

    // Routes
    console.log('Setting up routes...');
    app.use('/api/health', require('./routes/health'));
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/inventory', require('./routes/inventory'));
    app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
    app.use('/api/invoices', require('./routes/invoices'));
    app.use('/api/bills', require('./routes/bills'));
    app.use('/api/customers', require('./routes/customers'));
    app.use('/api/staff', require('./routes/staff'));
    app.use('/api/wholesalers', require('./routes/wholesalers'));
    app.use('/api/categories', require('./routes/categories'));
    app.use('/api/dashboard', require('./routes/dashboard'));
    console.log('Routes setup complete');

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ success: false, message: 'Route not found' });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Server startup complete');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
  }
};

console.log('Starting server...');
startServer().catch(error => {
  console.error('Unhandled error during server startup:', error);
  process.exit(1);
}); 