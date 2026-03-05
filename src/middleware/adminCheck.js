const isAdmin = (req, res, next) => {
  // This middleware assumes it runs AFTER `isAuthenticated`, 
  // so `req.user` should already exist.
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required for this action' });
  }
  // User is an admin, proceed
  next();
};

module.exports = { isAdmin };
