require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { connectDB } = require('./src/config/db');
const mongoose = require('mongoose');
const Student = require('./src/models/Student');
const Seat = require('./src/models/Seat');
const Inquiry = require('./src/models/Inquiry');
const ArchivedStudent = require('./src/models/ArchivedStudent');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// CORS — restrict to ALLOWED_ORIGINS in production; allow all in dev (fallback)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

if (IS_PRODUCTION && allowedOrigins.length === 0) {
  console.error('ALLOWED_ORIGINS must be set in production.');
  process.exit(1);
}

if (IS_PRODUCTION && JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server / curl calls (no origin header) and whitelisted origins.
    // If no whitelist configured, allow everything (development / first-boot convenience).
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest();
}

function safeEqual(a, b) {
  return crypto.timingSafeEqual(hashValue(a), hashValue(b));
}

function normalizeMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function isValidMobile(mobile) {
  const digits = normalizeMobile(mobile);
  return digits.length >= 10 && digits.length <= 15;
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = `${req.ip}:${req.method}:${req.originalUrl.split('?')[0]}`;
    const now = Date.now();
    const current = hits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }
    current.count += 1;
    hits.set(key, current);
    if (current.count > max) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const publicWriteLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: token required.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'development-only-secret-change-me');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: admin role required.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid or expired token.' });
  }
}

function buildAdmissionResponseMessage(student, notification) {
  const sent = [];
  const failed = [];
  if (notification.whatsapp.sent) sent.push('WhatsApp');
  else failed.push('WhatsApp');
  if (notification.email.sent) sent.push('Email');
  else if (notification.email.attempted) failed.push('Email');
  if (notification.pdf.generated) sent.push('PDF');

  const sentText = sent.length ? ` Sent/generated: ${sent.join(', ')}.` : '';
  const failedText = failed.length ? ` Pending/failed: ${failed.join(', ')}.` : '';
  return `Admission accepted for ${student.name}.${sentText}${failedText}`;
}

// Track MongoDB readiness so the middleware below can gate API calls
let isDbReady = false;

// Connect to MongoDB Atlas on startup
connectDB()
  .then(() => { isDbReady = true; })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// DB readiness gate — return 503 while Atlas connection is still being established
app.use((req, res, next) => {
  if (!isDbReady && req.path.startsWith('/api/v1/') && req.path !== '/api/v1/health') {
    return res.status(503).json({ success: false, message: 'Database connecting, please retry in a moment.' });
  }
  next();
});

// -------------------------------------------------------------
// 1. WhatsApp Web Automation Setup
// -------------------------------------------------------------
let isWaReady = false;
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

whatsappClient.on('qr', (qr) => {
  console.log('\n================ WA QR CODE ================');
  qrcode.generate(qr, { small: true });
  console.log('============================================\n');
});

whatsappClient.on('ready', () => {
  isWaReady = true;
  console.log('✅ WhatsApp Client connected and READY!');
});

whatsappClient.on('auth_failure', () => { isWaReady = false; });
whatsappClient.on('disconnected',  () => { isWaReady = false; });

whatsappClient.initialize().catch(err => console.error('WhatsApp Initialization error:', err));

// -------------------------------------------------------------
// 2. Email Setup (.env variables)
// -------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USER,
    pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS
  }
});

// Helper: Generate Professional PDF Receipt Buffer (4x6 Thermal/Cut-size Paper)
function generatePDFReceipt(student) {
  return new Promise((resolve, reject) => {
    try {
      const PAGE_W = 288;
      const PAGE_H = 432;

      const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });
      let buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const primaryColor   = '#1b365d';
      const darkTextColor  = '#2d3748';
      const mutedTextColor = '#718096';
      const borderColor    = '#e2e8f0';
      const paidBg         = '#ebf8ff';
      const paidBorder     = '#90cdf4';
      const paidText       = '#2b6cb0';

      const MARGIN    = 16;
      const CONTENT_W = PAGE_W - MARGIN * 2;

      const headerHeight = 64;
      doc.rect(0, 0, PAGE_W, headerHeight).fill(primaryColor);

      const logoSize = 34;
      const logoX = MARGIN;
      const logoY = 12;
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 5).fill('#ffffff');
      doc.font('Helvetica-Bold').fontSize(13).fillColor(primaryColor)
        .text('DDL', logoX, logoY + 10, { width: logoSize, align: 'center' });

      const textX = logoX + logoSize + 10;
      const textW = PAGE_W - textX - MARGIN;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
        .text('DURGA DIGITAL LIBRARY', textX, logoY, { width: textW, characterSpacing: 0.3 });
      doc.font('Helvetica').fontSize(6).fillColor('#bcd0e8')
        .text('Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211', textX, logoY + 14, { width: textW });
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff')
        .text('Contact: Saurav Kumar (7542893960)', textX, logoY + 23, { width: textW });

      const subStripY = headerHeight;
      doc.rect(0, subStripY, PAGE_W, 18).fill('#ebf4ff');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0c447c')
        .text('OFFICIAL PAYMENT RECEIPT', 0, subStripY + 5, { width: PAGE_W, align: 'center', characterSpacing: 0.6 });

      let cursorY = subStripY + 18 + 10;

      doc.font('Helvetica').fontSize(7).fillColor(mutedTextColor)
        .text('RECEIPT DATE', MARGIN, cursorY);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(darkTextColor)
        .text(new Date().toLocaleDateString('en-IN'), MARGIN, cursorY + 10);
      doc.font('Helvetica').fontSize(7).fillColor(mutedTextColor)
        .text('SEAT NO', 0, cursorY, { width: PAGE_W - MARGIN, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor)
        .text(student.seatCode || 'N/A', 0, cursorY + 9, { width: PAGE_W - MARGIN, align: 'right' });

      cursorY += 30;
      doc.moveTo(MARGIN, cursorY).lineTo(PAGE_W - MARGIN, cursorY)
        .dash(2, { space: 2 }).strokeColor(borderColor).lineWidth(1).stroke();
      doc.undash();
      cursorY += 10;

      const rowGap = 18;
      const drawDetailRow = (label, value) => {
        doc.font('Helvetica').fontSize(7.5).fillColor(mutedTextColor)
          .text(label.toUpperCase(), MARGIN, cursorY);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(darkTextColor)
          .text(value || 'N/A', 0, cursorY, { width: PAGE_W - MARGIN, align: 'right' });
        cursorY += rowGap;
      };

      drawDetailRow('Student Name', student.name);
      drawDetailRow('Mobile No',    student.mobile);
      drawDetailRow('Email ID',     student.email);
      drawDetailRow('Preparation',  student.preparation);
      drawDetailRow('Shift / Timing', `${student.shift || ''} ${student.shiftHours ? '(' + student.shiftHours + ')' : ''}`.trim());
      drawDetailRow('Duration',     student.duration);
      drawDetailRow('Joining Date', student.joiningDate);
      drawDetailRow('Expiry Date',  student.expiryDate);

      cursorY += 2;
      doc.moveTo(MARGIN, cursorY).lineTo(PAGE_W - MARGIN, cursorY)
        .dash(2, { space: 2 }).strokeColor(borderColor).lineWidth(1).stroke();
      doc.undash();
      cursorY += 8;

      const paidBoxHeight = 36;
      doc.roundedRect(MARGIN, cursorY, CONTENT_W, paidBoxHeight, 6)
        .fill(paidBg).strokeColor(paidBorder).lineWidth(1).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(paidText)
        .text('TOTAL PAID', MARGIN + 12, cursorY + 12);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(paidText)
        .text(`Rs. ${student.fee}`, 0, cursorY + 9, { width: PAGE_W - MARGIN - 12, align: 'right' });

      cursorY += paidBoxHeight + 10;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(primaryColor)
        .text('🌟 Register Friend / Inquiry Online:', MARGIN, cursorY, { align: 'center', width: CONTENT_W });
      cursorY += 10;
      doc.font('Helvetica').fontSize(6.5).fillColor('#2563eb')
        .text(process.env.INQUIRY_LINK || 'https://forms.gle/YOUR_LINK', MARGIN, cursorY, { align: 'center', width: CONTENT_W });
      cursorY += 12;
      doc.font('Helvetica-Bold').fontSize(5.8).fillColor(darkTextColor)
        .text('✨ 24/7 Open | CCTV Camera | Clean Washroom | RO Water | Wi-Fi | A.C. | Power Backup', MARGIN, cursorY, { align: 'center', width: CONTENT_W });
      cursorY += 12;
      doc.font('Helvetica-Oblique').fontSize(5.5).fillColor('#a0aec0')
        .text('This is a system generated digital receipt.', MARGIN, cursorY, { align: 'center', width: CONTENT_W });

      doc.rect(0, PAGE_H - 8, PAGE_W, 8).fill(primaryColor);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Helper: build WhatsApp admission message (reused by manual + online-admission accept)
function buildAdmissionWaMessage(s) {
  const inquiryLink = process.env.INQUIRY_LINK || 'https://forms.gle/evXNjDReA8Za7PgN9';
  return `*DURGA DIGITAL LIBRARY, MUNGER* 📚
📍 *Location:* Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211
📞 *Contact Person:* Saurav Kumar (7542893960)

Namaste *${s.name}*,
Aapka admission successfully confirm ho gaya hai!

📌 *Seat Code:* ${s.seatCode}
⏰ *Shift:* ${s.shift} (${s.shiftHours})
📅 *Joining Date:* ${s.joiningDate}
⏳ *Expiry Date:* ${s.expiryDate}
💰 *Fee Paid:* ₹${s.fee}

----------------------------------------
🌟 *Facilities Available:*
✔ 24/7 Open Library
✔ 🎥 24x7 CCTV Camera Surveillance
✔ 🧼 Clean & Separate Washrooms
✔ 💧 RO Mineral Water
✔ 🌐 High-Speed Free Wi-Fi
✔ ❄️ Fully Air-Conditioned (AC)
✔ ⚡ Uninterrupted Power Backup

🤝 *Share & Admission Inquiry Link:*
👉 ${inquiryLink}

Aapki Fee Receipt PDF neeche attached hai. Thank you!`;
}

// Helper: send admission WhatsApp + PDF (reused by manual + online-admission accept)
// WA failure is logged but does NOT crash or reject the admission — non-blocking by design.
async function sendAdmissionWhatsApp(s, pdfBuffer) {
  if (!s.mobile || !isWaReady) return;
  try {
    let cleanMobile = s.mobile.replace(/\D/g, '');
    if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`;
    const waChatId = `${cleanMobile}@c.us`;
    const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), `Receipt_${s.seatCode}.pdf`);
    await whatsappClient.sendMessage(waChatId, buildAdmissionWaMessage(s));
    await whatsappClient.sendMessage(waChatId, media);
    console.log(`💬 WhatsApp receipt sent to +${cleanMobile}`);
  } catch (err) {
    // WhatsApp failures must never abort an admission — just log and continue
    console.error('⚠️  WhatsApp send failed (admission still saved):', err.message);
  }
}

async function sendAdmissionEmail(s, pdfBuffer) {
  const senderEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;
  if (!s.email) {
    return { attempted: false, sent: false, attachmentSent: false, reason: 'email_missing' };
  }
  if (!senderEmail) {
    return { attempted: false, sent: false, attachmentSent: false, reason: 'smtp_sender_missing' };
  }
  try {
    const info = await transporter.sendMail({
      from:    `Durga Digital Library <${senderEmail}>`,
      to:      s.email,
      subject: `Admission Confirmed - Seat ${s.seatCode}`,
      text:    `Namaste ${s.name},\n\nAapka admission confirm ho gaya hai!\nReceipt PDF attached hai.\n\nThank You!\nDurga Digital Library\nContact: 7424893960`,
      attachments: [{ filename: `Receipt_${s.seatCode}.pdf`, content: pdfBuffer }]
    });
    return { attempted: true, sent: true, attachmentSent: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email Sending Error:', err.message);
    return { attempted: true, sent: false, attachmentSent: false, reason: err.message };
  }
}

async function sendAdmissionWhatsAppWithStatus(s, pdfBuffer) {
  if (!s.mobile) {
    return { attempted: false, sent: false, attachmentSent: false, reason: 'mobile_missing' };
  }
  if (!isWaReady) {
    return { attempted: false, sent: false, attachmentSent: false, reason: 'whatsapp_not_ready' };
  }
  try {
    const cleanMobile = normalizeMobile(s.mobile);
    const waChatId = `${cleanMobile}@c.us`;
    const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), `Receipt_${s.seatCode}.pdf`);
    await whatsappClient.sendMessage(waChatId, buildAdmissionWaMessage(s));
    await whatsappClient.sendMessage(waChatId, media);
    console.log(`WhatsApp receipt sent to +${cleanMobile}`);
    return { attempted: true, sent: true, attachmentSent: true, phone: cleanMobile };
  } catch (err) {
    console.error('WhatsApp send failed (admission still saved):', err.message);
    return { attempted: true, sent: false, attachmentSent: false, reason: err.message };
  }
}

// Helper: parse shift number robustly from any string like "Shift 1", "Shift 4", "1", "Full Day"
function parseShiftNum(shiftStr) {
  if (!shiftStr) return 1;
  const digits = shiftStr.replace(/[^0-9]/g, '');
  const n = parseInt(digits, 10);
  return (n >= 1 && n <= 4) ? n : 1;
}

// Helper: upsert a seat in the Seat collection (reused by create + accept + edit)
async function upsertSeat(seatCode, shiftStr, studentData) {
  const seatNum  = seatCode ? parseInt(seatCode.replace(/\D/g, ''), 10) : 1;
  const shiftNum = parseShiftNum(shiftStr);
  const seatKey  = `s_${seatNum}_shift_${shiftNum}`;
  await Seat.findOneAndUpdate(
    { seat_key: seatKey },
    {
      seat_key:     seatKey,
      seat_number:  seatNum,
      shift:        shiftNum,
      is_booked:    1,
      student_name: studentData.name        || '',
      mobile:       studentData.mobile      || '',
      preparation:  studentData.preparation || '',
      expiry_date:  studentData.expiryDate  || ''
    },
    { upsert: true, new: true }
  );
  return { seatKey, seatNum, shiftNum };
}

async function findSeatConflict(seatCode, shiftStr, excludeStudentId = null) {
  const seatNum = seatCode ? parseInt(String(seatCode).replace(/\D/g, ''), 10) : NaN;
  if (!Number.isInteger(seatNum) || seatNum < 1 || seatNum > 24) {
    return { invalid: true, message: 'Seat code must be between DDL001 and DDL024.' };
  }

  const shiftNum = parseShiftNum(shiftStr);
  const seatKey = `s_${seatNum}_shift_${shiftNum}`;
  const studentQuery = { seatCode, shift: shiftStr };
  if (excludeStudentId) studentQuery._id = { $ne: excludeStudentId };

  const [student, seat] = await Promise.all([
    Student.findOne(studentQuery),
    Seat.findOne({ seat_key: seatKey })
  ]);

  if (student || (seat && (!excludeStudentId || String(seat.mobile || '') !== ''))) {
    return { conflict: true, message: `${seatCode} is already booked for ${shiftStr}.` };
  }
  return { conflict: false, seatKey, seatNum, shiftNum };
}

// Helper: free a seat by seatCode + shift string
async function freeSeat(seatCode, shiftStr) {
  if (!seatCode) return;
  const seatNum  = parseInt(seatCode.replace(/\D/g, ''), 10);
  const shiftNum = parseShiftNum(shiftStr);
  const seatKey  = `s_${seatNum}_shift_${shiftNum}`;
  await Seat.deleteOne({ seat_key: seatKey });
}

// -------------------------------------------------------------
// 3. API Routes
// -------------------------------------------------------------

// Health check — used by PM2, load balancers, and uptime monitors
app.get('/api/v1/health', async (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongoState = dbState[mongoose.connection.readyState] || 'unknown';
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({
    status:    ok ? 'ok' : 'degraded',
    db:        mongoState,
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Public config — exposes safe frontend-needed values from env (no secrets)
app.get('/api/v1/config', (req, res) => {
  res.json({
    success:      true,
    inquiryLink:  process.env.INQUIRY_LINK || '',
    upiId:        process.env.UPI_ID       || ''
  });
});

// Admin Login
app.post('/api/v1/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';
  if (safeEqual(username, adminUser) && safeEqual(password, adminPass)) {
    const token = jwt.sign(
      { role: 'admin', username: adminUser },
      JWT_SECRET || 'development-only-secret-change-me',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({ success: true, token, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// Google Form Inquiry Submission Endpoint
app.post('/api/v1/inquiries', publicWriteLimiter, async (req, res) => {
  try {
    const { name, mobile, email, preparation, preferred_shift } = req.body;
    const normalizedMobile = normalizeMobile(mobile);
    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and Mobile are required' });
    }
    if (!isValidMobile(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number is invalid.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email address is invalid.' });
    }

    const duplicate = await Inquiry.findOne({
      normalizedMobile,
      admission_status: 'Pending'
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'A pending inquiry already exists for this mobile number.' });
    }

    await Inquiry.create({
      name, mobile, normalizedMobile, email: email || '', preparation: preparation || '',
      preferred_shift: preferred_shift || ''
    });
    console.log(`📩 New Inquiry Saved: ${name} (${mobile})`);

    if (mobile && isWaReady) {
      let cleanMobile = mobile.replace(/\D/g, '');
      if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`;
      const welcomeMessage = `*DURGA DIGITAL LIBRARY, MUNGER* 📚\n\nNamaste *${name}*,\nDurga Digital Library me enquiry karne ke liye dhanyawad!\n\n📍 *Location:* Kalarampur, Near Shiv Mandir, NH-80, Munger\n📞 *Contact:* Saurav Kumar (7424893960)\n\n✨ *Facilities:*\n✔ 24/7 Open Library\n✔ 🎥 24x7 CCTV Security\n✔ 🧼 Clean Washrooms\n✔ 💧 RO Water | 🌐 High-Speed Wi-Fi | ❄️ A.C.\n\nHamari team jald hi aapase contact karegi!`;
      whatsappClient.sendMessage(`${cleanMobile}@c.us`, welcomeMessage).catch(err => console.error('WA Msg Error:', err));
    }

    res.status(200).json({ success: true, message: 'Inquiry saved successfully' });
  } catch (err) {
    console.error('❌ Inquiry Endpoint Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch All Inquiries — admin only
app.get('/api/v1/inquiries', requireAdmin, async (req, res) => {
  try {
    const inquiriesList = await Inquiry.find({}).sort({ createdAt: -1 });
    res.json({ success: true, inquiries: inquiriesList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Student Registration & Fee Payment Flow
app.post('/api/v1/students', requireAdmin, async (req, res) => {
  const s = req.body;
  try {
    if (!s.name || !s.mobile || !s.seatCode || !s.shift || !s.joiningDate || !s.expiryDate) {
      return res.status(400).json({ success: false, message: 'name, mobile, seatCode, shift, joiningDate and expiryDate are required.' });
    }
    if (!isValidMobile(s.mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number is invalid.' });
    }
    if (!isValidEmail(s.email)) {
      return res.status(400).json({ success: false, message: 'Email address is invalid.' });
    }

    const seatConflict = await findSeatConflict(s.seatCode, s.shift);
    if (seatConflict.invalid || seatConflict.conflict) {
      return res.status(seatConflict.invalid ? 400 : 409).json({ success: false, message: seatConflict.message });
    }

    // 1. Insert Student
    await Student.create({
      seatCode:    s.seatCode,
      name:        s.name,
      email:       s.email       || '',
      mobile:      s.mobile,
      normalizedMobile: normalizeMobile(s.mobile),
      preparation: s.preparation || 'General',
      duration:    s.duration    || '1 Month(s)',
      joiningDate: s.joiningDate,
      expiryDate:  s.expiryDate,
      fee:         parseFloat(s.fee) || 0,
      shift:       s.shift       || 'Shift 1',
      shiftHours:  s.shiftHours  || ''
    });

    // 2. Reserve Seat Matrix
    await upsertSeat(s.seatCode, s.shift, s);

    // 3. Generate Receipt PDF
    const pdfBuffer = await generatePDFReceipt(s);
    const notification = {
      pdf: { generated: true, bytes: pdfBuffer.length },
      email: await sendAdmissionEmail(s, pdfBuffer),
      whatsapp: await sendAdmissionWhatsAppWithStatus(s, pdfBuffer)
    };

    res.status(201).json({
      success: true,
      message: buildAdmissionResponseMessage(s, notification),
      notification
    });
  } catch (err) {
    console.error('❌ DB/Notification Error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate student or seat assignment detected.' });
    }
    res.status(500).json({ success: false, message: 'Unable to register student.' });
  }
});

// Fetch Student Directory — admin only
app.get('/api/v1/students', requireAdmin, async (req, res) => {
  try {
    const studentsList = await Student.find({}).sort({ createdAt: -1 });
    res.json({ students: studentsList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Seat Grid Matrix — admin only
app.get('/api/v1/seats', requireAdmin, async (req, res) => {
  const shift = parseInt(req.query.shift) || 1;
  const seatArray = [];
  try {
    const bookedSeats = await Seat.find({ shift });
    const bookedMap = {};
    bookedSeats.forEach(s => { bookedMap[s.seat_number] = s; });

    for (let i = 1; i <= 24; i++) {
      if (bookedMap[i]) {
        seatArray.push({
          seat_number:  i,
          is_booked:    true,
          student_name: bookedMap[i].student_name,
          mobile:       bookedMap[i].mobile,
          preparation:  bookedMap[i].preparation,
          expiry_date:  bookedMap[i].expiry_date
        });
      } else {
        seatArray.push({ seat_number: i, is_booked: false });
      }
    }
    res.json({ seats: seatArray });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alerts API (Upcoming Expiring Seats in 5 Days)
// Normalises field names to match frontend expectations:
//   frontend reads: a.seat_code, a.expiry_date (snake_case from old SQLite schema)
app.get('/api/v1/alerts', requireAdmin, async (req, res) => {
  try {
    const today    = new Date();
    const students = await Student.find({});
    const alerts   = students
      .filter(s => {
        if (!s.expiryDate) return false;
        const diffDays = Math.ceil((new Date(s.expiryDate) - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
      })
      .map(s => ({
        id:          s._id.toString(),
        name:        s.name,
        mobile:      s.mobile,
        // provide both camelCase (Mongoose) and snake_case (frontend legacy) field names
        seatCode:    s.seatCode,
        seat_code:   s.seatCode,
        expiryDate:  s.expiryDate,
        expiry_date: s.expiryDate,
        shift:       s.shift,
        preparation: s.preparation
      }));
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Finance Analytics Endpoint
app.get('/api/v1/finance/stats', requireAdmin, async (req, res) => {
  try {
    const allStudents = await Student.find({});
    const today = new Date();
    let totalRevenue = 0, shift1Revenue = 0, shift2Revenue = 0, shift3Revenue = 0;
    let pendingDueRevenue = 0, expiringCount = 0;

    allStudents.forEach(s => {
      const fee = parseFloat(s.fee) || 0;
      totalRevenue += fee;
      if (s.shift && s.shift.includes('1'))      shift1Revenue += fee;
      else if (s.shift && s.shift.includes('2')) shift2Revenue += fee;
      else                                        shift3Revenue += fee;
      if (s.expiryDate) {
        const diffDays = Math.ceil((new Date(s.expiryDate) - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 5) { pendingDueRevenue += fee; expiringCount++; }
      }
    });

    res.json({ success: true, stats: { totalRevenue, shift1Revenue, shift2Revenue, shift3Revenue, pendingDueRevenue, expiringCount, totalStudents: allStudents.length } });
  } catch (err) {
    console.error('Finance API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic UPI Payment Endpoint
app.get('/api/v1/payment/upi-link', requireAdmin, (req, res) => {
  const { amount, name, seatCode } = req.query;
  const upiId       = process.env.UPI_ID || 'durgadigital@upi';
  const payeeName   = 'Durga Digital Library';
  const note        = `Fee for ${name || 'Student'} - Seat ${seatCode || 'DDL'}`;
  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrCodeUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiDeepLink)}`;
  res.json({ success: true, upiId, amount, upiDeepLink, qrCodeUrl });
});

// -------------------------------------------------------------
// 3-B. STUDENT MANAGEMENT: Edit & Delete
// -------------------------------------------------------------

// Edit Student (update student record + sync seat matrix)
app.put('/api/v1/students/:id', requireAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const s         = req.body;
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id.' });
    }
    if (s.mobile && !isValidMobile(s.mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number is invalid.' });
    }
    if (s.email && !isValidEmail(s.email)) {
      return res.status(400).json({ success: false, message: 'Email address is invalid.' });
    }

    const existing = await Student.findById(studentId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const newSeatCode  = s.seatCode  || existing.seatCode;
    const newShift     = s.shift     || existing.shift;

    // Free old seat if seat or shift changed
    if (newSeatCode !== existing.seatCode || newShift !== existing.shift) {
      const seatConflict = await findSeatConflict(newSeatCode, newShift, studentId);
      if (seatConflict.invalid || seatConflict.conflict) {
        return res.status(seatConflict.invalid ? 400 : 409).json({ success: false, message: seatConflict.message });
      }
      await freeSeat(existing.seatCode, existing.shift);
    }

    // Update student record
    const updated = await Student.findByIdAndUpdate(
      studentId,
      {
        name:        s.name        || existing.name,
        mobile:      s.mobile      || existing.mobile,
        normalizedMobile: normalizeMobile(s.mobile || existing.mobile),
        email:       s.email       ?? existing.email,
        preparation: s.preparation || existing.preparation,
        shift:       newShift,
        shiftHours:  s.shiftHours  || existing.shiftHours,
        fee:         s.fee !== undefined ? parseFloat(s.fee) : existing.fee,
        joiningDate: s.joiningDate || existing.joiningDate,
        expiryDate:  s.expiryDate  || existing.expiryDate,
        seatCode:    newSeatCode
      },
      { new: true }
    );

    // Upsert seat matrix with new values
    await upsertSeat(newSeatCode, newShift, {
      name:        s.name        || existing.name,
      mobile:      s.mobile      || existing.mobile,
      preparation: s.preparation || existing.preparation,
      expiryDate:  s.expiryDate  || existing.expiryDate
    });

    return res.json({ success: true, message: 'Student updated successfully.', student: updated });
  } catch (err) {
    console.error('❌ Edit Student Error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate student or seat assignment detected.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to update student.' });
  }
});

// Delete Student (archive + free seat + remove from active directory)
app.delete('/api/v1/students/:id', requireAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id.' });
    }
    const student   = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // 1. Archive before deletion
    await ArchivedStudent.create({
      originalId:  student._id.toString(),
      seatCode:    student.seatCode,
      name:        student.name,
      email:       student.email,
      mobile:      student.mobile,
      preparation: student.preparation,
      duration:    student.duration,
      joiningDate: student.joiningDate,
      expiryDate:  student.expiryDate,
      fee:         student.fee,
      paymentMode: student.paymentMode || 'Cash',
      shift:       student.shift,
      shiftHours:  student.shiftHours,
      reason:      'Deleted from Directory by Admin'
    });

    // 2. Free allocated seat
    await freeSeat(student.seatCode, student.shift);

    // 3. Hard delete
    await Student.findByIdAndDelete(studentId);

    console.log(`🗑️ Student deleted & archived: ${student.name} (${student.seatCode})`);
    return res.json({ success: true, message: `Student "${student.name}" deleted and seat freed successfully.` });
  } catch (err) {
    console.error('❌ Delete Student Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 3-C. ONLINE ADMISSIONS: View Pending / Accept / Reject
// -------------------------------------------------------------
app.post('/api/v1/online-admissions', async (req, res) => {
  try {
    const data = req.body;

    const admission = await Inquiry.create({
      name: data.name || '',
      mobile: data.mobile || '',
      email: data.email || '',
      preparation: data.course || data.preparation || '',
      preferred_shift: data.shift || data.preferred_shift || '',
      address: data.address || '',
      admission_status: 'Pending',
      source: 'google_form'
    });

    console.log(`📥 New Online Admission: ${admission.name} (${admission.mobile})`);

    return res.status(201).json({
      success: true,
      message: 'Online admission submitted successfully',
      admission
    });
  } catch (error) {
    console.error('Online admission save error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// Fetch Pending Online Admissions
app.get('/api/v1/online-admissions', requireAdmin, async (req, res) => {
  try {
    const rows = await Inquiry.find({ admission_status: 'Pending' }).sort({ createdAt: -1 });
    return res.json({ success: true, admissions: rows });
  } catch (err) {
    console.error('❌ Online Admissions Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Accept Online Admission
app.post('/api/v1/online-admissions/accept/:id', requireAdmin, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    if (!isValidObjectId(inquiryId)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry id.' });
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Admission record not found.' });
    }
    if (inquiry.admission_status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Admission already ${inquiry.admission_status}.` });
    }

    const { seatCode, shift, shiftHours, fee, duration, joiningDate, expiryDate } = req.body;
    if (!seatCode || !shift || !fee || !joiningDate || !expiryDate) {
      return res.status(400).json({ success: false, message: 'seatCode, shift, fee, joiningDate and expiryDate are required.' });
    }

    // Validate seat availability before creating student
    const seatConflict = await findSeatConflict(seatCode, shift);
    if (seatConflict.invalid || seatConflict.conflict) {
      return res.status(seatConflict.invalid ? 400 : 409).json({ success: false, message: seatConflict.message });
    }

    const s = {
      seatCode,
      name:        inquiry.name,
      email:       inquiry.email       || '',
      mobile:      inquiry.mobile,
      normalizedMobile: normalizeMobile(inquiry.mobile),
      preparation: inquiry.preparation || 'General',
      duration:    duration            || '1 Month(s)',
      joiningDate,
      expiryDate,
      fee:         parseFloat(fee),
      shift,
      shiftHours:  shiftHours || ''
    };

    // 1. Create student record
    await Student.create(s);

    // 2. Reserve Seat Matrix
    await upsertSeat(s.seatCode, s.shift, s);

    // 3. Generate PDF Receipt
    const pdfBuffer = await generatePDFReceipt(s);

    // 4. Send Email + WhatsApp using status-reporting helpers (failures don't abort)
    const notification = {
      pdf:      { generated: true, bytes: pdfBuffer.length },
      email:    await sendAdmissionEmail(s, pdfBuffer),
      whatsapp: await sendAdmissionWhatsAppWithStatus(s, pdfBuffer)
    };

    // 5. Mark inquiry as Accepted
    await Inquiry.findByIdAndUpdate(inquiryId, { admission_status: 'Accepted', payment_status: 'Paid' });

    console.log(`✅ Online Admission Accepted: ${s.name} → Seat ${s.seatCode}`);
    return res.status(201).json({
      success: true,
      message: buildAdmissionResponseMessage(s, notification),
      notification
    });
  } catch (err) {
    console.error('❌ Accept Admission Error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Seat already allocated to another student.' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Reject Online Admission
app.post('/api/v1/online-admissions/reject/:id', requireAdmin, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    if (!isValidObjectId(inquiryId)) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry id.' });
    }

    const inquiry = await Inquiry.findById(inquiryId);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Admission record not found.' });
    }
    if (inquiry.admission_status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Admission already ${inquiry.admission_status}.` });
    }

    await Inquiry.findByIdAndUpdate(inquiryId, { admission_status: 'Rejected' });

    console.log(`❌ Online Admission Rejected: ${inquiry.name} (${inquiry.mobile})`);
    return res.json({ success: true, message: `Admission rejected for ${inquiry.name}.` });
  } catch (err) {
    console.error('❌ Reject Admission Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 4. CRON JOB: Daily Expiry Warning via WhatsApp
// -------------------------------------------------------------
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Running Daily MongoDB Expiry Check...');
  const today = new Date();

  try {
    const allStudents = await Student.find({});
    for (const s of allStudents) {
      if (!s.expiryDate) continue;
      const diffDays = Math.ceil((new Date(s.expiryDate) - today) / (1000 * 60 * 60 * 24));

      if ((diffDays === 2 || diffDays === 1) && s.mobile && isWaReady) {
        let cleanMobile = s.mobile.replace(/\D/g, '');
        if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`;
        const alertText = `⚠️ *LIBRARY MEMBERSHIP EXPIRY ALERT*\n\nNamaste *${s.name}*,\nAapki seat (*${s.seatCode}*) ki membership *${s.expiryDate}* ko samapt ho rahi hai (${diffDays} din bache hain).\nKripya fee renew karwayein.\n\nDurga Digital Library\nContact: 7424893960`;
        await whatsappClient.sendMessage(`${cleanMobile}@c.us`, alertText);
      }
    }
  } catch (err) {
    console.error('Cron Error:', err);
  }
});

// 404 handler for /api/v1/* — must come before the SPA catch-all
// Without this, Express 5 app.use() fallback serves HTML for unknown API paths
app.use('/api/v1', (req, res) => {
  res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Serve Single Page Web App Index
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Durga Library System running on http://localhost:${PORT}`);
});
