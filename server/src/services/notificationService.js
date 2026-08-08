import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  const from = config.email.user;
  if (!to || !from) return { sent: false, reason: !to ? 'no_recipient' : 'no_sender' };
  try {
    const info = await transporter.sendMail({ 
      from: `Durga Digital Library <${from}>`, 
      to, 
      subject, 
      text, 
      html, 
      attachments 
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error('[notificationService] email error:', err.message);
    return { sent: false, reason: err.message };
  }
}

function normalizeMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendWhatsApp(mobile, message) {
  const client = global.whatsappClient;
  if (!client || !client.info || !client.info.wid) {
    return { sent: false, reason: 'whatsapp_not_ready' };
  }
  if (!mobile) return { sent: false, reason: 'no_mobile' };
  try {
    const wid = `${normalizeMobile(mobile)}@c.us`;
    await client.sendMessage(wid, message);
    return { sent: true };
  } catch (err) {
    logger.error('[notificationService] whatsapp error:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function send(opts = {}) {
  const {
    recipient, type, title, body,
    channel = 'in_app',
    email, mobile,
    metadata = {},
    expiresAt = null,
    attachments = []
  } = opts;

  const notif = await Notification.create({
    recipient: recipient || null,
    type,
    title,
    body,
    channel,
    isRead: false,
    metadata,
    expiresAt
  });

  const sentVia = { email: false, whatsapp: false };

  if (channel === 'email' || channel === 'all') {
    const result = await sendEmail({ to: email, subject: title, text: body, attachments });
    sentVia.email = result.sent;
    await Notification.updateOne({ _id: notif._id }, { 'sentVia.email': result.sent });
  }

  if (channel === 'whatsapp' || channel === 'all') {
    const result = await sendWhatsApp(mobile, `*${title}*\n\n${body}`);
    sentVia.whatsapp = result.sent;
    await Notification.updateOne({ _id: notif._id }, { 'sentVia.whatsapp': result.sent });
  }

  return { notification: notif, sentVia };
}

export async function sendRenewalReminder({ student, daysLeft }) {
  const title = '⚠️ Membership Expiry Reminder';
  const body = `Namaste ${student.name},\n\nAapki library membership (Seat ${student.seatCode}) ${daysLeft} din mein expire ho rahi hai (${student.expiryDate}).\n\nKripya renewal karwayein taaki aapki seat surakshit rahe.\n\nDurga Digital Library\nContact: 7542893960`;

  return send({
    recipient: student._id,
    type: 'renewal_reminder',
    title,
    body,
    channel: 'all',
    email: student.email,
    mobile: student.mobile
  });
}

export async function sendMembershipActivated({ student, membership }) {
  const title = '✅ Membership Activated';
  const body = `Namaste ${student.name},\n\nAapki library membership successfully activate ho gayi hai!\n\nSeat: ${student.seatCode}\nShift: ${student.shift}\nValid Until: ${membership.expiryDate}\n\nDurga Digital Library`;

  return send({
    recipient: student._id,
    type: 'membership_activated',
    title,
    body,
    channel: 'all',
    email: student.email,
    mobile: student.mobile
  });
}

export async function markRead(studentId, notifIds = []) {
  const filter = { recipient: studentId };
  if (notifIds.length) filter._id = { $in: notifIds };
  const result = await Notification.updateMany(filter, { isRead: true });
  return result.modifiedCount;
}

export async function getForStudent(studentId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const skip = (page - 1) * limit;
  const filter = {
    $or: [{ recipient: studentId }, { recipient: null }],
    ...(unreadOnly ? { isRead: false } : {})
  };
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false })
  ]);
  return { notifications, total, unreadCount, page, limit };
}

export async function broadcast({ type = 'announcement', title, body, metadata = {} }) {
  return Notification.create({ recipient: null, type, title, body, channel: 'in_app', metadata });
}
