const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting - simplified configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database initialization
const db = require('./database/init');

// Routes
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Check multiple possible build paths for Vercel deployment
  const possibleBuildPaths = [
    path.join(__dirname, '../client/build'),
    path.join(__dirname, '../../client/build'),
    path.join(__dirname, 'client/build'),
    path.join(__dirname, '../build'),
    path.join(__dirname, 'build')
  ];
  
  let buildPath = null;
  for (const buildDir of possibleBuildPaths) {
    if (require('fs').existsSync(buildDir)) {
      buildPath = buildDir;
      break;
    }
  }
  
  if (buildPath) {
    console.log(`Serving static files from: ${buildPath}`);
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    console.log('React build not found, serving API only');
    // Fallback for when build doesn't exist
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Medicine Shop SaaS API is running!',
        status: 'API only mode - React build not found',
        endpoints: {
          auth: '/api/auth',
          inventory: '/api/inventory',
          purchaseOrders: '/api/purchase-orders',
          invoices: '/api/invoices',
          bills: '/api/bills',
          customers: '/api/customers',
          staff: '/api/staff',
          wholesalers: '/api/wholesalers',
          categories: '/api/categories',
          dashboard: '/api/dashboard',
          health: '/api/health'
        }
      });
    });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
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
}); 