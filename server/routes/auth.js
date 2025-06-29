const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, generateToken } = require('../middleware/auth');
const db = require('../database/init');
const router = express.Router();

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error comparing passwords' });
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken(user);
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });
  });
});

// Setup route - create first admin user (no auth required)
router.post('/setup', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  // Check if any users exist
  db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(403).json({ success: false, message: 'Setup already completed. Use registration instead.' });
    }

    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error hashing password' });
      }

      // Insert first admin user
      db.run(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, 'admin'],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error creating admin user' });
          }

          const token = generateToken({ id: this.lastID, username, email, role: 'admin' });
          res.json({
            success: true,
            message: 'Admin user created successfully',
            token,
            user: {
              id: this.lastID,
              username,
              email,
              role: 'admin'
            }
          });
        }
      );
    });
  });
});

// Register route - now public for initial setup
router.post('/register', (req, res) => {
  const { username, email, password, role = 'staff' } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  // Check if user already exists
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }

    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error hashing password' });
      }

      // Insert new user
      db.run(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, role],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error creating user' });
          }

          const token = generateToken({ id: this.lastID, username, email, role });
          res.json({
            success: true,
            message: 'User created successfully',
            token,
            user: {
              id: this.lastID,
              username,
              email,
              role
            }
          });
        }
      );
    });
  });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  });
});

// Change password
router.put('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }

  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error comparing passwords' });
      }

      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error hashing password' });
        }

        db.run(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedPassword, req.user.id],
          (err) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Error updating password' });
            }

            res.json({ success: true, message: 'Password updated successfully' });
          }
        );
      });
    });
  });
});

module.exports = router; 