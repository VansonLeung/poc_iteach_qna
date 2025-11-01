import { verifyToken } from '../utils/crypto.js';

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('Authorization failed: No user in request');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('Authorization check - User role:', req.user.role, 'Required roles:', roles);

    if (!roles.includes(req.user.role)) {
      console.log('Authorization failed: Role mismatch');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
