const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/init');
const logger = require('../utils/logger');


// The secret key used to sign the JWT (from your .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 1. Find user in the database
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Generate a JWT token containing the user's ID and role
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' } // Token expires in 24 hours
    );

    // 4. Set the token as an HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true, // Prevents client-side JS from reading the cookie
      // secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      secure: false, // works with http
      // sameSite: 'strict', // Protects against Cross-Site Request Forgery (CSRF)
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    });

    // Return user data (excluding the password hash)
    res.json({
      message: 'Logged in successfully',
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};


const logout = (req, res) => {
  // Clear the HTTP-only cookie
  res.clearCookie('token', {
    httpOnly: true,
    // secure: process.env.NODE_ENV === 'production',
    secure: false,
    // sameSite: 'strict',
    sameSite: 'lax',
  });

  res.json({ message: 'Logged out successfully' });
};

const register = async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 2. Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // 3. Hash password
    const hash = await bcrypt.hash(password, 10);

    // 4. Insert new user
    const insert = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
    const result = insert.run(email, hash, role);

    res.status(201).json({
      message: 'User created successfully',
      user: { id: result.lastInsertRowid, email, role }
    });
  } catch (error) {
    logger.error('Register error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllUsers = (req, res) => {
  try {
    const users = db.prepare('SELECT id, email, role FROM users').all();
    res.json({ users });
  } catch (error) {
    logger.error('Error fetching users', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const updateUserRole = (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
    const result = stmt.run(role, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    logger.error('Error updating user', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { login, logout, register, getAllUsers, updateUserRole, deleteUser };
