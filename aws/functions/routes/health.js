const express = require('express');
const { query } = require('../database/init');
const router = express.Router();

// Basic health check that doesn't depend on the database
router.get('/liveness', (req, res) => {
  res.json({
    success: true,
    message: 'Service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Full health check including database connection
router.get('/', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT 1');
    
    res.json({
      success: true,
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      message: 'Service is unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router; 