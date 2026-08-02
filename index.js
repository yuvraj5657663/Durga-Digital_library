require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initDB } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = null;

// Initialize SQLite DB safely
initDB().then(async (database) => {
  db = database;

  // Ensure Inquiries Table Exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      preparation TEXT,
      preferred_shift TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("💾 Database and Inquiries table verified & ready!");
}).catch(err => {
  console.error("❌ Database initialization error:", err);
});

// Middleware to ensure DB connection
app.use((req, res, next) => {
  if (!db && req.path.startsWith('/api/v1/')) {
    return res.status(503).json({ success: false, message: "Database connecting, please try again in a moment." });
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
whatsappClient.on('disconnected', () => { isWaReady = false; });

whatsappClient.initialize().catch(err => console.error("WhatsApp Initialization error:", err));

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

      const primaryColor = '#1b365d';
      const darkTextColor = '#2d3748';
      const mutedTextColor = '#718096';
      const borderColor = '#e2e8f0';
      const paidBg = '#ebf8ff';
      const paidBorder = '#90cdf4';
      const paidText = '#2b6cb0';

      const MARGIN = 16;
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
        .text('Contact: Saurav Kumar (7424893960)', textX, logoY + 23, { width: textW });

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
      drawDetailRow('Mobile No', student.mobile);
      drawDetailRow('Email ID', student.email);
      drawDetailRow('Preparation', student.preparation);
      drawDetailRow('Shift / Timing', `${student.shift || ''} ${student.shiftHours ? '(' + student.shiftHours + ')' : ''}`.trim());
      drawDetailRow('Duration', student.duration);
      drawDetailRow('Joining Date', student.joiningDate);
      drawDetailRow('Expiry Date', student.expiryDate);

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

// -------------------------------------------------------------
// 3. API Routes
// -------------------------------------------------------------

// Admin Login
app.post('/api/v1/admin/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASS || "admin123";

  if (username === adminUser && password === adminPass) {
    res.json({ token: "durga-library-secret-token-xyz" });
  } else {
    res.status(401).json({ message: "Invalid username or password" });
  }
});

// Google Form Inquiry Submission Endpoint
app.post('/api/v1/inquiries', async (req, res) => {
  try {
    const { name, mobile, email, preparation, preferred_shift } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: "Name and Mobile are required" });
    }

    await db.run(
      `INSERT INTO inquiries (name, mobile, email, preparation, preferred_shift) VALUES (?, ?, ?, ?, ?)`,
      [name, mobile, email || '', preparation || '', preferred_shift || '']
    );

    console.log(`📩 New Inquiry Saved: ${name} (${mobile})`);

    // WhatsApp Alert
    if (mobile && isWaReady) {
      let cleanMobile = mobile.replace(/\D/g, '');
      if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`;
      const waChatId = `${cleanMobile}@c.us`;

      const welcomeMessage = `*DURGA DIGITAL LIBRARY, MUNGER* 📚

Namaste *${name}*,
Durga Digital Library me enquiry karne ke liye dhanyawad! 

📍 *Location:* Kalarampur, Near Shiv Mandir, NH-80, Munger
📞 *Contact:* Saurav Kumar (7542893960)

✨ *Facilities:*
✔ 24/7 Open Library
✔ 🎥 24x7 CCTV Security
✔ 🧼 Clean Washrooms
✔ 💧 RO Water | 🌐 High-Speed Wi-Fi | ❄️ A.C.

Hamari team jald hi aapase contact karegi!`;

      whatsappClient.sendMessage(waChatId, welcomeMessage).catch(err => console.error("WA Msg Error:", err));
    }

    res.status(200).json({ success: true, message: "Inquiry saved successfully" });

  } catch (err) {
    console.error("❌ Inquiry Endpoint Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch All Inquiries
app.get('/api/v1/inquiries', async (req, res) => {
  try {
    const inquiriesList = await db.all(`SELECT * FROM inquiries ORDER BY id DESC`);
    res.json({ success: true, inquiries: inquiriesList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Student Registration & Fee Payment Flow
app.post('/api/v1/students', async (req, res) => {
  const s = req.body;

  try {
    // 1. Insert Student
    await db.run(
      `INSERT INTO students (seatCode, name, email, mobile, preparation, duration, joiningDate, expiryDate, fee, shift, shiftHours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.seatCode, s.name, s.email, s.mobile, s.preparation, s.duration, s.joiningDate, s.expiryDate, s.fee, s.shift, s.shiftHours]
    );

    // 2. Reserve Seat Matrix
    const seatNumMatch = s.seatCode ? s.seatCode.match(/\d+/) : null;
    const seatNum = seatNumMatch ? parseInt(seatNumMatch[0]) : 1;
    const shiftNum = s.shift ? parseInt(s.shift.replace(/[^0-9]/g, '')) || 1 : 1;
    const seatKey = `s_${seatNum}_shift_${shiftNum}`;

    await db.run(
      `INSERT OR REPLACE INTO seats (seat_key, seat_number, shift, is_booked, student_name, mobile, preparation, expiry_date)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      [seatKey, seatNum, shiftNum, s.name, s.mobile, s.preparation, s.expiryDate]
    );

    // 3. Generate Receipt PDF
    const pdfBuffer = await generatePDFReceipt(s);
    const senderEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;

    // Email Dispatch
    if (s.email && senderEmail) {
      transporter.sendMail({
        from: `Durga Digital Library <${senderEmail}>`,
        to: s.email,
        subject: `Admission Confirmed - Seat ${s.seatCode}`,
        text: `Namaste ${s.name},\n\nAapka admission confirm ho gaya hai!\nReceipt PDF attached hai.\n\nThank You!\nDurga Digital Library\nContact: 7424893960`,
        attachments: [{ filename: `Receipt_${s.seatCode}.pdf`, content: pdfBuffer }]
      }).catch(err => console.error("Email Sending Error:", err));
    }

    // WhatsApp Message & Receipt PDF
    if (s.mobile && isWaReady) {
      let cleanMobile = s.mobile.replace(/\D/g, '');
      if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`;
      const waChatId = `${cleanMobile}@c.us`;

      const inquiryLink = process.env.INQUIRY_LINK || "https://forms.gle/YOUR_LINK";

      const waTextMessage = `*DURGA DIGITAL LIBRARY, MUNGER* 📚
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

      const media = new MessageMedia(
        'application/pdf',
        pdfBuffer.toString('base64'),
        `Receipt_${s.seatCode}.pdf`
      );

      await whatsappClient.sendMessage(waChatId, waTextMessage);
      await whatsappClient.sendMessage(waChatId, media);
      console.log(`💬 WhatsApp receipt sent to +${cleanMobile}`);
    }

    res.status(201).json({ success: true, message: "Student registered & saved to database successfully!" });

  } catch (err) {
    console.error("❌ DB/Notification Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch Student Directory
app.get('/api/v1/students', async (req, res) => {
  try {
    const studentsList = await db.all(`SELECT * FROM students ORDER BY id DESC`);
    res.json({ students: studentsList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Seat Grid Matrix
app.get('/api/v1/seats', async (req, res) => {
  const shift = req.query.shift || 1;
  const seatArray = [];

  try {
    const bookedSeats = await db.all(`SELECT * FROM seats WHERE shift = ?`, [shift]);
    const bookedMap = {};
    bookedSeats.forEach(s => bookedMap[s.seat_number] = s);

    for (let i = 1; i <= 24; i++) {
      if (bookedMap[i]) {
        seatArray.push({
          seat_number: i,
          is_booked: true,
          student_name: bookedMap[i].student_name,
          mobile: bookedMap[i].mobile,
          preparation: bookedMap[i].preparation,
          expiry_date: bookedMap[i].expiry_date
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
app.get('/api/v1/alerts', async (req, res) => {
  try {
    const today = new Date();
    const students = await db.all(`SELECT * FROM students`);
    
    const alerts = students.filter(s => {
      if (!s.expiryDate) return false;
      const expDate = new Date(s.expiryDate);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 5;
    });

    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Finance Analytics Endpoint
app.get('/api/v1/finance/stats', async (req, res) => {
  try {
    const allStudents = await db.all(`SELECT * FROM students`);
    const today = new Date();
    
    let totalRevenue = 0;
    let shift1Revenue = 0;
    let shift2Revenue = 0;
    let shift3Revenue = 0;
    let pendingDueRevenue = 0;
    let expiringCount = 0;

    allStudents.forEach(s => {
      const fee = parseFloat(s.fee) || 0;
      totalRevenue += fee;

      if (s.shift && s.shift.includes('1')) {
        shift1Revenue += fee;
      } else if (s.shift && s.shift.includes('2')) {
        shift2Revenue += fee;
      } else {
        shift3Revenue += fee;
      }

      if (s.expiryDate) {
        const expiry = new Date(s.expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 5) {
          pendingDueRevenue += fee;
          expiringCount++;
        }
      }
    });

    res.json({
      success: true,
      stats: {
        totalRevenue,
        shift1Revenue,
        shift2Revenue,
        shift3Revenue,
        pendingDueRevenue,
        expiringCount,
        totalStudents: allStudents.length
      }
    });
  } catch (err) {
    console.error("Finance API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic UPI Payment Endpoint
app.get('/api/v1/payment/upi-link', (req, res) => {
  const { amount, name, seatCode } = req.query;
  
  const upiId = process.env.UPI_ID || "durgadigital@upi"; 
  const payeeName = "Durga Digital Library";
  const note = `Fee for ${name || 'Student'} - Seat ${seatCode || 'DDL'}`;

  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiDeepLink)}`;

  res.json({
    success: true,
    upiId,
    amount,
    upiDeepLink,
    qrCodeUrl
  });
});

// -------------------------------------------------------------
// 3-B. STUDENT MANAGEMENT: Edit & Delete
// -------------------------------------------------------------

// Edit Student (update student record + sync seat matrix)
app.put('/api/v1/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const s = req.body;

    // Fetch existing record first so we can free/update the seat correctly
    const existing = await db.get(`SELECT * FROM students WHERE id = ?`, [studentId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Update student record with all editable fields
    await db.run(
      `UPDATE students SET
        name       = ?,
        mobile     = ?,
        email      = ?,
        preparation= ?,
        shift      = ?,
        shiftHours = ?,
        fee        = ?,
        joiningDate= ?,
        expiryDate = ?,
        seatCode   = ?
      WHERE id = ?`,
      [
        s.name        || existing.name,
        s.mobile      || existing.mobile,
        s.email       ?? existing.email,
        s.preparation || existing.preparation,
        s.shift       || existing.shift,
        s.shiftHours  || existing.shiftHours,
        s.fee         !== undefined ? parseFloat(s.fee) : existing.fee,
        s.joiningDate || existing.joiningDate,
        s.expiryDate  || existing.expiryDate,
        s.seatCode    || existing.seatCode,
        studentId
      ]
    );

    // Sync seat matrix: remove old seat entry if seat/shift changed, update new one
    const oldSeatNum  = existing.seatCode  ? parseInt(existing.seatCode.replace(/\D/g, ''))  : null;
    const oldShiftNum = existing.shift     ? parseInt(existing.shift.replace(/[^0-9]/g, '')) || 1 : 1;
    const newSeatNum  = (s.seatCode || existing.seatCode) ? parseInt((s.seatCode || existing.seatCode).replace(/\D/g, '')) : oldSeatNum;
    const newShiftNum = (s.shift    || existing.shift)    ? parseInt((s.shift    || existing.shift).replace(/[^0-9]/g, '')) || 1 : oldShiftNum;

    const oldKey = `s_${oldSeatNum}_shift_${oldShiftNum}`;
    const newKey = `s_${newSeatNum}_shift_${newShiftNum}`;

    // If seat/shift changed, free old seat entry
    if (oldKey !== newKey) {
      await db.run(`DELETE FROM seats WHERE seat_key = ?`, [oldKey]);
    }

    // Upsert the seat matrix entry with updated info
    await db.run(
      `INSERT OR REPLACE INTO seats (seat_key, seat_number, shift, is_booked, student_name, mobile, preparation, expiry_date)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        newKey,
        newSeatNum,
        newShiftNum,
        s.name        || existing.name,
        s.mobile      || existing.mobile,
        s.preparation || existing.preparation,
        s.expiryDate  || existing.expiryDate
      ]
    );

    const updated = await db.get(`SELECT * FROM students WHERE id = ?`, [studentId]);
    return res.json({ success: true, message: 'Student updated successfully.', student: updated });

  } catch (err) {
    console.error('❌ Edit Student Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Student (archive + free seat + remove from active directory)
app.delete('/api/v1/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await db.get(`SELECT * FROM students WHERE id = ?`, [studentId]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // 1. Archive the student record before deletion (soft-delete history)
    await db.run(
      `INSERT OR REPLACE INTO archived_students
        (id, seatCode, name, email, mobile, preparation, duration, joiningDate, expiryDate, fee, paymentMode, shift, shiftHours, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.id, student.seatCode, student.name, student.email, student.mobile,
        student.preparation, student.duration, student.joiningDate, student.expiryDate,
        student.fee, student.paymentMode || 'Cash', student.shift, student.shiftHours,
        'Deleted from Directory by Admin'
      ]
    );

    // 2. Free the allocated seat in the seat matrix
    if (student.seatCode) {
      const seatNum  = parseInt(student.seatCode.replace(/\D/g, ''));
      const shiftNum = student.shift ? parseInt(student.shift.replace(/[^0-9]/g, '')) || 1 : 1;
      const seatKey  = `s_${seatNum}_shift_${shiftNum}`;
      await db.run(`DELETE FROM seats WHERE seat_key = ?`, [seatKey]);
    }

    // 3. Hard delete from active students table
    await db.run(`DELETE FROM students WHERE id = ?`, [studentId]);

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

// Fetch Pending Online Admissions (admission_status = 'Pending')
app.get('/api/v1/online-admissions', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT * FROM inquiries WHERE admission_status = 'Pending' ORDER BY id DESC`
    );
    return res.json({ success: true, admissions: rows });
  } catch (err) {
    console.error('❌ Online Admissions Fetch Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Accept Online Admission — reuses existing student registration + WhatsApp/Email/PDF logic
app.post('/api/v1/online-admissions/accept/:id', async (req, res) => {
  try {
    const inquiryId = req.params.id;

    const inquiry = await db.get(`SELECT * FROM inquiries WHERE id = ?`, [inquiryId]);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Admission record not found.' });
    }
    if (inquiry.admission_status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Admission already ${inquiry.admission_status}.` });
    }

    // Admin supplies seat + shift + fee + duration from the Accept form in the frontend
    const {
      seatCode,
      shift,
      shiftHours,
      fee,
      duration,
      joiningDate,
      expiryDate
    } = req.body;

    if (!seatCode || !shift || !fee || !joiningDate || !expiryDate) {
      return res.status(400).json({ success: false, message: 'seatCode, shift, fee, joiningDate and expiryDate are required to accept admission.' });
    }

    // Build student object — reuse identical shape as POST /api/v1/students
    const s = {
      seatCode,
      name:        inquiry.name,
      email:       inquiry.email       || '',
      mobile:      inquiry.mobile,
      preparation: inquiry.preparation || 'General',
      duration:    duration            || '1 Month(s)',
      joiningDate,
      expiryDate,
      fee:         parseFloat(fee),
      shift,
      shiftHours:  shiftHours         || ''
    };

    // 1. Insert into students table (identical to POST /api/v1/students)
    await db.run(
      `INSERT INTO students (seatCode, name, email, mobile, preparation, duration, joiningDate, expiryDate, fee, shift, shiftHours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.seatCode, s.name, s.email, s.mobile, s.preparation, s.duration, s.joiningDate, s.expiryDate, s.fee, s.shift, s.shiftHours]
    );

    // 2. Reserve Seat Matrix (identical to POST /api/v1/students)
    const seatNumMatch = s.seatCode ? s.seatCode.match(/\d+/) : null;
    const seatNum      = seatNumMatch ? parseInt(seatNumMatch[0]) : 1;
    const shiftNum     = s.shift     ? parseInt(s.shift.replace(/[^0-9]/g, '')) || 1 : 1;
    const seatKey      = `s_${seatNum}_shift_${shiftNum}`;

    await db.run(
      `INSERT OR REPLACE INTO seats (seat_key, seat_number, shift, is_booked, student_name, mobile, preparation, expiry_date)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      [seatKey, seatNum, shiftNum, s.name, s.mobile, s.preparation, s.expiryDate]
    );

    // 3. Generate PDF Receipt (same helper used for manual admissions)
    const pdfBuffer    = await generatePDFReceipt(s);
    const senderEmail  = process.env.EMAIL_USER || process.env.GMAIL_USER;

    // 4. Send Email Receipt (identical to POST /api/v1/students)
    if (s.email && senderEmail) {
      transporter.sendMail({
        from:    `Durga Digital Library <${senderEmail}>`,
        to:      s.email,
        subject: `Admission Confirmed - Seat ${s.seatCode}`,
        text:    `Namaste ${s.name},\n\nAapka admission confirm ho gaya hai!\nReceipt PDF attached hai.\n\nThank You!\nDurga Digital Library\nContact: 7424893960`,
        attachments: [{ filename: `Receipt_${s.seatCode}.pdf`, content: pdfBuffer }]
      }).catch(err => console.error('Email Sending Error:', err));
    }

    // 5. Send WhatsApp Message + PDF (identical to POST /api/v1/students)
    if (s.mobile && isWaReady) {
      let cleanMobile = s.mobile.replace(/\D/g, '');
      if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`;
      const waChatId    = `${cleanMobile}@c.us`;
      const inquiryLink = process.env.INQUIRY_LINK || 'https://forms.gle/YOUR_LINK';

      const waTextMessage = `*DURGA DIGITAL LIBRARY, MUNGER* 📚
📍 *Location:* Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211
📞 *Contact Person:* Saurav Kumar (7424893960)

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

      const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), `Receipt_${s.seatCode}.pdf`);
      await whatsappClient.sendMessage(waChatId, waTextMessage);
      await whatsappClient.sendMessage(waChatId, media);
      console.log(`💬 WhatsApp receipt sent to +${cleanMobile}`);
    }

    // 6. Mark inquiry as Accepted so it leaves the Pending list
    await db.run(
      `UPDATE inquiries SET admission_status = 'Accepted', payment_status = 'Paid' WHERE id = ?`,
      [inquiryId]
    );

    console.log(`✅ Online Admission Accepted: ${s.name} → Seat ${s.seatCode}`);
    return res.status(201).json({ success: true, message: `Admission accepted for ${s.name}. WhatsApp, Email & PDF sent.` });

  } catch (err) {
    console.error('❌ Accept Admission Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Reject Online Admission — marks as Rejected, no seat/student created
app.post('/api/v1/online-admissions/reject/:id', async (req, res) => {
  try {
    const inquiryId = req.params.id;

    const inquiry = await db.get(`SELECT * FROM inquiries WHERE id = ?`, [inquiryId]);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Admission record not found.' });
    }
    if (inquiry.admission_status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Admission already ${inquiry.admission_status}.` });
    }

    await db.run(
      `UPDATE inquiries SET admission_status = 'Rejected' WHERE id = ?`,
      [inquiryId]
    );

    console.log(`❌ Online Admission Rejected: ${inquiry.name} (${inquiry.mobile})`);
    return res.json({ success: true, message: `Admission rejected for ${inquiry.name}.` });

  } catch (err) {
    console.error('❌ Reject Admission Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 4. CRON JOB: Expiry Warning Check from SQLite
// -------------------------------------------------------------
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Running Daily SQLite Expiry Check...');
  const today = new Date();

  try {
    if (!db) return;
    const allStudents = await db.all(`SELECT * FROM students`);
    for (let s of allStudents) {
      if (!s.expiryDate) continue;
      const expiry = new Date(s.expiryDate);
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

      if ((diffDays === 2 || diffDays === 1) && s.mobile && isWaReady) {
        let cleanMobile = s.mobile.replace(/\D/g, '');
        if (cleanMobile.length === 10) cleanMobile = `91${cleanMobile}`;
        const waChatId = `${cleanMobile}@c.us`;

        const alertText = `⚠️ *LIBRARY MEMBERSHIP EXPIRY ALERT*\n\nNamaste *${s.name}*,\nAapki seat (*${s.seatCode}*) ki membership *${s.expiryDate}* ko samapt ho rahi hai (${diffDays} din bache hain).\nKripya fee renew karwayein.\n\nDurga Digital Library\nContact: 7424893960`;

        await whatsappClient.sendMessage(waChatId, alertText);
      }
    }
  } catch (err) {
    console.error("Cron Error:", err);
  }
});

// Serve Single Page Web App Index
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Durga Library System running on http://localhost:${PORT}`);
});