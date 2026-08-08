import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import userRepository from '../repositories/UserRepository.js';

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
          id: 'env-admin',
          role: 'admin',
          username: config.admin.user,
          email: config.admin.email
        };
        return next();
      }

      // Find user in database
      const user = await userRepository.findById(decoded.userId);
      
      if (!user || !user.active) {
        throw new AuthenticationError('Invalid or inactive user');
      }

      req.user = {
        id: user._id.toString(),
        role: user.role,
        username: user.username,
        email: user.email,
        studentRef: user.studentRef
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
  if (req.user?.role !== 'admin') {
    return next(new AuthorizationError('Admin access required'));
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
