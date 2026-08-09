import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import userRepository from '../repositories/UserRepository.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

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
    const loginId = String(username).trim().toLowerCase();
    let user = await userRepository.findByLoginId(loginId);

    const envAdminUser = config.admin.user;
    const envAdminPass = config.admin.pass;
    const isEnvAdminLogin = username === envAdminUser && password === envAdminPass;

    if (!user && isEnvAdminLogin) {
      user = getEnvAdminUser();
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordValid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : isEnvAdminLogin;

    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    if (user._id !== 'env-admin') {
      await AuditLog.create({
        user: user._id,
        action: 'login',
        details: { ip, userAgent }
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
    logger.error('Login Error:', error);
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
      throw new Error('Invalid refresh token');
    }

    const accessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user);
    
    return { accessToken, refreshToken: nextRefreshToken };
  } catch (error) {
    logger.error('Refresh token error:', error);
    throw error;
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
