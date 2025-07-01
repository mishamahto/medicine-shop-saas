const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const invoicesRoutes = require('./routes/invoices');
const billsRoutes = require('./routes/bills');
const contactsRoutes = require('./routes/contacts');
const purchaseOrdersRoutes = require('./routes/purchaseOrders');
const dashboardRoutes = require('./routes/dashboard');
const healthRoutes = require('./routes/health');

const app = express();

// Immediate health check endpoint
app.get('/_health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start the server — Cloud Run requires this
const port = process.env.PORT || 8080;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`${new Date().toISOString()} - Server is running on port ${port}`);
});

server.on('error', (error) => {
  console.error(`${new Date().toISOString()} - Server error:`, error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(`${new Date().toISOString()} - SIGTERM received, shutting down gracefully`);
  server.close(() => {
    console.log(`${new Date().toISOString()} - Server closed`);
    process.exit(0);
  });
});
