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
    logger.info(`User logged in: ${email}`);

    // Return user data (excluding the password hash)
    res.json({
      message: 'Logged in successfully',
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
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

  logger.info('User logged out');
  res.json({ message: 'Logged out successfully' });
};


module.exports = { login, logout };
