import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import userRepository from '../repositories/UserRepository.js';
import config from '../config/index.js';
import logger from '../config/logger.js';
import { AuthenticationError } from '../utils/errors.js';

function getEnvAdminUser() {
  return {
    _id: 'env-admin',
    id: 'env-admin',
    name: 'Admin',
    role: 'admin',
    username: config.admin.user,
    email: config.admin.email
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      userId:     user._id.toString(),
      role:       user.role,
      email:      user.email,
      username:   user.username,
      // studentRef lets requireStudent middleware resolve the student document
      studentRef: user.studentRef ? user.studentRef.toString() : undefined
    },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpires }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      userId:     user._id.toString(),
      role:       user.role,
      email:      user.email,
      username:   user.username,
      studentRef: user.studentRef ? user.studentRef.toString() : undefined
    },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpires }
  );
}

export async function login(username, password, ip, userAgent) {
  try {
    // Normalise for DB lookup only — keep original for env-admin comparison
    const loginId = String(username || '').trim().toLowerCase();
    const rawUser = String(username || '').trim();
    const rawPass = String(password || '');

    const envAdminUser = String(config.admin.user || '').trim();
    const envAdminPass = String(config.admin.pass || '').trim();

    // Check env-admin FIRST using case-insensitive comparison
    // This allows typing "Admin", "ADMIN", "admin" and still matching
    const isEnvAdminLogin =
      rawUser.toLowerCase() === envAdminUser.toLowerCase() &&
      rawPass === envAdminPass;

    // Look up user in DB (students + any DB-stored admins)
    let user = await userRepository.findByLoginId(loginId);

    // If no DB user found but credentials match env-admin, use synthetic admin
    if (!user && isEnvAdminLogin) {
      user = getEnvAdminUser();
    }

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password:
    //   • Real DB users  → bcrypt compare
    //   • env-admin      → already verified above via isEnvAdminLogin
    let passwordValid = false;
    if (user._id === 'env-admin') {
      passwordValid = isEnvAdminLogin;
    } else if (user.passwordHash) {
      passwordValid = await bcrypt.compare(rawPass, user.passwordHash);
    } else {
      passwordValid = false;
    }

    if (!passwordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    if (user._id !== 'env-admin') {
      await AuditLog.create({
        actorId:   user._id,
        action:    'login',
        actorRole: user.role,
        actorName: user.username || user.name || '',
        details:   { ip, userAgent }
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id:         user._id.toString(),
        role:       user.role,
        username:   user.username,
        email:      user.email,
        studentRef: user.studentRef ? user.studentRef.toString() : undefined,
        name:       user.name || user.username
      }
    };
  } catch (error) {
    logger.error('Login Error:', error.message);
    throw error;
  }
}

export async function refreshToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret);
    const user = decoded.userId === 'env-admin'
      ? getEnvAdminUser()
      : await userRepository.findById(decoded.userId);

    if (!user) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const accessToken  = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user);

    return { accessToken, refreshToken: nextRefreshToken };
  } catch (error) {
    // Re-throw AuthenticationError and JWT errors as-is
    if (error.statusCode) throw error;
    logger.error('Refresh token error:', error.message);
    throw new AuthenticationError('Invalid or expired refresh token');
  }
}

export async function registerStudent(data) {
  const { username, email, password, ...studentData } = data;
  
  const existingUser = await userRepository.findByEmail(email) || 
                      await userRepository.findByUsername(username);
  
  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await userRepository.createStudent({
    username,
    email,
    passwordHash,
    ...studentData
  });

  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordValid) {
    throw new Error('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.updateById(userId, { passwordHash });

  return { success: true };
}
