import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import PasswordResetOtp from '../models/PasswordResetOtp.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const GENERIC_MESSAGE = 'If an account exists for that email, a password reset code has been sent.';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: { user: config.email.user, pass: config.email.pass }
});

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendResetEmail(email, code) {
  if (!config.email.user || !config.email.pass) {
    logger.warn('[passwordReset] Email provider is not configured');
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.email.from || config.email.user,
      to: email,
      subject: 'Durga Digital Library password reset code',
      text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
      html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`
    });
    return true;
  } catch (error) {
    logger.error('[passwordReset] Email provider error:', error.response || error.code || error.message);
    return false;
  }
}

export async function requestPasswordReset(email, requestedFrom = '') {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail, active: true });

  if (!user) return { message: GENERIC_MESSAGE };

  await PasswordResetOtp.updateMany(
    { email: normalizedEmail, purpose: 'password_reset', usedAt: null },
    { usedAt: new Date() }
  );

  const code = generateCode();
  await PasswordResetOtp.create({
    user: user._id,
    email: normalizedEmail,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    maxAttempts: MAX_ATTEMPTS,
    requestedFrom
  });

  await sendResetEmail(normalizedEmail, code);
  return { message: GENERIC_MESSAGE };
}

export async function resetPasswordWithOtp(email, code, newPassword) {
  const normalizedEmail = normalizeEmail(email);
  const reset = await PasswordResetOtp.findOne({
    email: normalizedEmail,
    purpose: 'password_reset',
    usedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!reset || reset.attempts >= reset.maxAttempts) {
    throw new Error('Invalid or expired reset code');
  }

  if (hashCode(code) !== reset.codeHash) {
    reset.attempts += 1;
    await reset.save();
    throw new Error('Invalid or expired reset code');
  }

  const user = await User.findOne({ _id: reset.user, email: normalizedEmail, active: true });
  if (!user) throw new Error('Invalid or expired reset code');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.refreshTokens = [];
  await user.save();

  reset.usedAt = new Date();
  await reset.save();
  return { success: true };
}
