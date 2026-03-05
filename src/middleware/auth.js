const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

const isAuthenticated = (req, res, next) => {

  // 1. Extract the token from the cookies
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {

    // 2. Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Attach the decoded user payload to the request object
    // This allows subsequent routes/controllers to know WHO is making the request
    req.user = decoded;

    // Move to the next middleware or controller
    next();
  } catch (error) {
    logger.error(`JWT Verification failed: ${error.message}`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { isAuthenticated };
