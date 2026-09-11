const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: 'Invalid authorization header'
      });
    }

    const payload = verifyToken(token);

    const userId = Number(payload.sub);

    if (!userId) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    const user = User.findById(userId);

    if (!user) {
      return res.status(401).json({
        error: 'User no longer exists'
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'You do not have permission to access this resource'
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize
};