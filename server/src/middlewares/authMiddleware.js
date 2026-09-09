import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import userRepository from '../repositories/UserRepository.js';
import { roleHasPermission, roleIsStaff, permissionsForRole } from '../config/accessControl.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization token required');
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Check if it's the environment admin
      if (decoded.userId === 'env-admin') {
        req.user = {
          id:       'env-admin',   // display / audit string only
          userId:   null,           // null = not a real DB user, safe for ObjectId fields
          role:     'SUPER_ADMIN',
          permissions: ['*'],
          username: config.admin.user,
          email:    config.admin.email
        };
        return next();
      }

      // Find user in database
      const user = await userRepository.findById(decoded.userId);

      if (!user || !user.active) {
        throw new AuthenticationError('Invalid or inactive user');
      }

      req.user = {
        id:         user._id.toString(), // always a valid ObjectId string
        userId:     user._id.toString(), // alias — use this for ObjectId fields
        role:       user.role,
        permissions: user.permissions || permissionsForRole(user.role),
        username:   user.username,
        email:      user.email,
        studentRef: user.studentRef ? user.studentRef.toString() : decoded.studentRef
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token expired');
      }
      if (jwtError.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      }
      throw jwtError;
    }
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (req, res, next) => {
  if (!roleIsStaff(req.user?.role)) {
    return next(new AuthorizationError('Staff access required'));
  }
  next();
};

export const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return next(new AuthorizationError('Student access required'));
  }
  next();
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AuthorizationError(`Access restricted to: ${roles.join(', ')}`));
    }
    next();
  };
};

export const hasPermission = (user, permission) => {
  return roleHasPermission(user?.role, permission, user?.permissions);
};

export const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return next(new AuthorizationError(`Permission required: ${permission}`));
  }
  next();
};

export const requireAllPermissions = (...permissions) => (req, res, next) => {
  const missing = permissions.filter(permission => !hasPermission(req.user, permission));
  if (missing.length) {
    return next(new AuthorizationError(`Permissions required: ${missing.join(', ')}`));
  }
  next();
};
