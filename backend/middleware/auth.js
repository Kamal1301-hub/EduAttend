const jwt = require('jsonwebtoken');

// Verify any JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Only super admin can access
const superAdminOnly = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
    next();
  });
};

// Only institute can access
const instituteOnly = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'institute') {
      return res.status(403).json({ success: false, message: 'Institute access required' });
    }
    next();
  });
};

module.exports = { verifyToken, superAdminOnly, instituteOnly };
