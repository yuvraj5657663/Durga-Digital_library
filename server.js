require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');

// WHATSAPP LIBRARIES
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';
const GMAIL_USER = process.env.GMAIL_USER || 'Yuvrajkumar4588@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'qrjx erxj zisk psov';

// --------------------------------------------------
// 1. AUTHENTICATION MIDDLEWARE
// --------------------------------------------------
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Access Token Required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
        req.user = user;
        next();
    });
}

// --------------------------------------------------
// 2. WHATSAPP BOT SETUP
// --------------------------------------------------
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('\n================================================--');
    console.log('📲 SCAN QR CODE TO CONNECT WHATSAPP:');
    console.log('================================================--');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp Bot Active!');
});

whatsappClient.initialize();

// --------------------------------------------------
// 3. DATABASE SETUP & HELPER FUNCTIONS
// --------------------------------------------------
const db = new sqlite3.Database('./library_master.db', (err) => {
    if (err) console.error('Database Error:', err);
    else console.log('✓ SQLite Database Connected');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT UNIQUE, value TEXT)`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('total_seats', '25')`);

    // 1. Create admins table if not exists
    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            username TEXT UNIQUE NOT NULL, 
            password TEXT NOT NULL
        )
    `);

    // 2. Safe Migration: Automatically add missing columns if they don't exist
    db.run(`ALTER TABLE admins ADD COLUMN email TEXT`, (err) => { /* Ignore if already exists */ });
    db.run(`ALTER TABLE admins ADD COLUMN mobile TEXT`, (err) => { /* Ignore if already exists */ });

    // 3. Insert default admin
    const defaultPasswordHash = bcrypt.hashSync('adminpassword', 10);
    db.run(`
        INSERT OR IGNORE INTO admins (username, password, email, mobile) 
        VALUES ('admin', ?, ?, ?)
    `, [defaultPasswordHash, GMAIL_USER, '919876543210']);

    // Update existing admin account if columns were added later
    db.run(`
        UPDATE admins 
        SET email = ?, mobile = ? 
        WHERE username = 'admin' AND (email IS NULL OR mobile IS NULL)
    `, [GMAIL_USER, '919876543210']);

    db.run(`
        CREATE TABLE IF NOT EXISTS admissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            study TEXT NOT NULL,
            whatsapp_mobile TEXT UNIQUE NOT NULL,
            email_id TEXT UNIQUE NOT NULL,
            address TEXT NOT NULL,
            shift INTEGER CHECK (shift IN (1, 2, 3)) NOT NULL,
            shift_timing TEXT NOT NULL,
            seat_number TEXT NOT NULL,
            admission_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            library_fee REAL DEFAULT 500,
            admission_fee REAL DEFAULT 100,
            security_deposit REAL DEFAULT 200,
            discount REAL DEFAULT 50,
            status TEXT DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});
    const defaultPasswordHash = bcrypt.hashSync('adminpassword', 10);
    db.run(`
        INSERT OR IGNORE INTO admins (username, password, email, mobile) 
        VALUES ('admin', ?, ?, ?)
    `, [defaultPasswordHash, GMAIL_USER, '919876543210']); // Change default admin mobile as needed

    db.run(`
        CREATE TABLE IF NOT EXISTS admissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            study TEXT NOT NULL,
            whatsapp_mobile TEXT UNIQUE NOT NULL,
            email_id TEXT UNIQUE NOT NULL,
            address TEXT NOT NULL,
            shift INTEGER CHECK (shift IN (1, 2, 3)) NOT NULL,
            shift_timing TEXT NOT NULL,
            seat_number TEXT NOT NULL,
            admission_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            library_fee REAL DEFAULT 500,
            admission_fee REAL DEFAULT 100,
            security_deposit REAL DEFAULT 200,
            discount REAL DEFAULT 50,
            status TEXT DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


function checkAndUpdateExpiryStatus() {
    return new Promise((resolve, reject) => {
        const today = new Date().toISOString().slice(0, 10);
        const sql = `UPDATE admissions SET status = 'EXPIRED' WHERE expiry_date < ? AND status = 'ACTIVE'`;
        db.run(sql, [today], function(err) {
            if (err) return reject(err);
            if (this.changes > 0) {
                console.log(`⚠️ Alert: ${this.changes} students updated to EXPIRED.`);
            }
            resolve(this.changes);
        });
    });
}

// --------------------------------------------------
// 4. EMAIL SERVICE & ALERTS
// --------------------------------------------------
const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// --------------------------------------------------
// AUTOMATED EXPIRY & RENEWAL NOTIFICATIONS
// --------------------------------------------------
async function processDailyExpiryNotifications() {
    console.log('⏰ Running Daily Expiry & Renewal Notification Check...');
    
    // 1. Database status update
    await checkAndUpdateExpiryStatus();

    // 2. Fetch Admin Details dynamically
    db.get(`SELECT email, mobile FROM admins WHERE username = 'admin' LIMIT 1`, async (adminErr, adminData) => {
        if (adminErr) {
            console.error('❌ Error fetching admin details:', adminErr);
            return;
        }

        const adminEmail = (adminData && adminData.email) ? adminData.email : GMAIL_USER;
        let adminMobile = (adminData && adminData.mobile) ? adminData.mobile : null;

        const today = new Date().toISOString().slice(0, 10);

        // 3. Fetch expiring/expired students
        const studentSql = `
            SELECT * FROM admissions 
            WHERE (expiry_date = ? OR expiry_date = DATE(?, '+2 days')) 
            AND status != 'CANCELLED'
        `;

        db.all(studentSql, [today, today], async (err, students) => {
            if (err) {
                console.error('❌ Error fetching expiring students:', err);
                return;
            }

            if (!students || students.length === 0) {
                console.log('ℹ️ No expiring students found for today.');
                return;
            }

            console.log(`📢 Found ${students.length} student(s) for expiry/renewal alerts.`);

            let adminSummaryText = `🚨 *DURGA LIBRARY - DAILY EXPIRY & RENEWAL REPORT* 🚨\nDate: ${today}\n----------------------------------------\n`;

            for (const student of students) {
                const isToday = (student.expiry_date === today);
                
                let userMsg = '';
                let emailSubject = '';

                if (isToday) {
                    userMsg = `⚠️ *SUBSCRIPTION EXPIRED TODAY!* 📚\n\nNamaste *${student.full_name}*,\nDurga Digital Library me aapka subscription aaj (*${student.expiry_date}*) expire ho gaya hai.\n\n🪑 Seat No: *${student.seat_number}*\n⏰ Shift: Shift ${student.shift}\n\nKripya apni seat continue rakhne ke liye library counter par aakar **RENEW** karwayen.\nThank you!`;
                    emailSubject = `⚠️ Subscription Expired - Durga Digital Library (${student.seat_number})`;
                } else {
                    userMsg = `🔔 *RENEWAL REMINDER* 📚\n\nNamaste *${student.full_name}*,\nDurga Digital Library me aapka subscription *2 din me* (*${student.expiry_date}*) expire ho raha hai.\n\n🪑 Seat No: *${student.seat_number}*\n⏰ Shift: Shift ${student.shift}\n\nSeat kisi aur ko assign hone se bachane ke liye samay par **RENEW** karwayen.\nThank you!`;
                    emailSubject = `🔔 Renewal Reminder: 2 Days Left - Durga Digital Library`;
                }

                // Student WhatsApp
                try {
                    let studentMobile = student.whatsapp_mobile.replace(/[^0-9]/g, '');
                    if (studentMobile.length === 10) studentMobile = '91' + studentMobile;
                    const studentChatId = `${studentMobile}@c.us`;

                    await whatsappClient.sendMessage(studentChatId, userMsg);
                    console.log(`✅ Student WhatsApp sent to: ${student.full_name}`);
                } catch (waErr) {
                    console.error(`❌ Student WhatsApp Error (${student.full_name}):`, waErr.message);
                }

                // Student Email
                try {
                    await gmailTransporter.sendMail({
                        from: `"Durga Digital Library" <${GMAIL_USER}>`,
                        to: student.email_id,
                        subject: emailSubject,
                        text: userMsg
                    });
                    console.log(`✅ Student Email sent to: ${student.full_name}`);
                } catch (mailErr) {
                    console.error(`❌ Student Email Error (${student.full_name}):`, mailErr.message);
                }

                adminSummaryText += `👤 *${student.full_name}*\n🪑 Seat: ${student.seat_number} (Shift ${student.shift})\n📱 Mobile: ${student.whatsapp_mobile}\n📅 Expiry: ${student.expiry_date} ${isToday ? '🔴 (EXPIRED TODAY)' : '🟡 (IN 2 DAYS)'}\n----------------------------------------\n`;
            }

            // Admin WhatsApp
            try {
                let adminChatId = null;
                if (adminMobile) {
                    let cleanAdminMobile = adminMobile.replace(/[^0-9]/g, '');
                    if (cleanAdminMobile.length === 10) cleanAdminMobile = '91' + cleanAdminMobile;
                    adminChatId = `${cleanAdminMobile}@c.us`;
                } else if (whatsappClient.info) {
                    adminChatId = whatsappClient.info.wid._serialized;
                }

                if (adminChatId) {
                    await whatsappClient.sendMessage(adminChatId, adminSummaryText);
                    console.log(`✅ Admin WhatsApp Summary Sent!`);
                }
            } catch (adminWaErr) {
                console.error('❌ Admin WhatsApp Error:', adminWaErr.message);
            }

            // Admin Email
            try {
                await gmailTransporter.sendMail({
                    from: `"Durga Library System" <${GMAIL_USER}>`,
                    to: adminEmail,
                    subject: `🚨 Admin Alert: ${students.length} Student(s) Expiring / Expired Today!`,
                    text: adminSummaryText
                });
                console.log(`✅ Admin Email Summary Sent!`);
            } catch (adminMailErr) {
                console.error('❌ Admin Email Error:', adminMailErr.message);
            }
        });
    });
}

// CRON JOB: Runs daily at 8:00 AM
cron.schedule('0 8 * * *', () => {
    processDailyExpiryNotifications();
});

// Test endpoint (No login required for testing)
app.get('/api/v1/test-expiry-trigger', async (req, res) => {
    try {
        await processDailyExpiryNotifications();
        res.json({ success: true, message: 'Expiry notification process executed successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --------------------------------------------------
// 5. RECEIPT & PDF GENERATORS
// --------------------------------------------------
function createReceiptPDF(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A6', margin: 20 });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const total = data.library_fee + data.admission_fee + data.security_deposit - data.discount;
            const receiptNo = `DDL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(data.id).padStart(4, '0')}`;

            doc.fillColor('#1e3a8a').fontSize(14).text('DURGA DIGITAL LIBRARY', { align: 'center' });
            doc.fontSize(8).fillColor('#555').text('Official Admission Receipt', { align: 'center' });
            doc.moveDown(0.5);

            doc.fontSize(9).fillColor('#000');
            doc.text(`Receipt No : ${receiptNo}`);
            doc.text(`Date : ${data.admission_date}`);
            doc.text(`Valid Until : ${data.expiry_date}`);
            doc.moveDown(0.3);
            doc.text(`Student Name : ${data.full_name}`);
            doc.text(`Seat Number : ${data.seat_number}`);
            doc.text(`Shift : Shift ${data.shift} (${data.shift_timing})`);
            doc.text(`Mobile : ${data.whatsapp_mobile}`);
            doc.moveDown(0.5);

            doc.fontSize(11).fillColor('#1e3a8a').text(`Total Amount Paid: Rs. ${total}`);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

function generateReceiptHTML(data) {
    const total = data.library_fee + data.admission_fee + data.security_deposit - data.discount;
    const receiptNo = `DDL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(data.id).padStart(4, '0')}`;
    const studentId = `DDL${String(data.id).padStart(6, '0')}`;

    return `
    <div style="max-width: 480px; margin: auto; padding: 24px; font-family: Arial, sans-serif; border: 2px solid #1e3a8a; background: #fff; border-radius: 12px;">
        <div style="text-align: center; border-bottom: 2px dashed #1e3a8a; padding-bottom: 12px;">
            <h2 style="margin: 0; color: #1e3a8a; font-size: 22px;">DURGA DIGITAL LIBRARY</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #555;">Official Fee Receipt & Student Confirmation</p>
        </div>
        <div style="margin: 16px 0; font-size: 13px; line-height: 1.6;">
            <p style="margin: 2px 0;"><b>Receipt No :</b> ${receiptNo}</p>
            <p style="margin: 2px 0;"><b>Admission Date :</b> ${data.admission_date}</p>
            <p style="margin: 2px 0; color: #dc2626;"><b>Valid Until :</b> ${data.expiry_date}</p>
            <hr style="border: none; border-top: 1px dashed #ccc; margin: 10px 0;" />
            <p style="margin: 2px 0;"><b>Student Name :</b> ${data.full_name}</p>
            <p style="margin: 2px 0;"><b>Student ID :</b> ${studentId}</p>
            <p style="margin: 2px 0; color: #16a34a; font-size: 16px;"><b>ASSIGNED SEAT : ${data.seat_number}</b></p>
            <p style="margin: 2px 0;"><b>Selected Shift :</b> Shift ${data.shift} (${data.shift_timing})</p>
        </div>
        <div style="background: #1e3a8a; color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 14px; margin-top: 10px;">
            <p style="margin: 0; display: flex; justify-content: space-between;"><b>Total Amount Paid:</b> <span><b>₹${total}</b></span></p>
        </div>
    </div>`;
}

// --------------------------------------------------
// 6. API ROUTES
// --------------------------------------------------

// Login
app.post('/api/v1/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, admin) => {
        if (err || !admin) return res.status(401).json({ success: false, message: 'Invalid Username!' });

        const isMatch = bcrypt.compareSync(password, admin.password);
        if (isMatch) {
            const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '12h' });

            // Return Admin Info to Frontend
            return res.json({ 
                success: true, 
                token, 
                admin: {
                    username: admin.username,
                    email: admin.email,
                    mobile: admin.mobile
                },
                message: 'Login Successful!' 
            });
        }
        return res.status(401).json({ success: false, message: 'Invalid Password!' });
    });
});

// Protected: Get admissions
app.get('/api/v1/admissions', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM admissions ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(rows || []);
    });
});

// Protected: New admission
app.post('/api/v1/admissions', authenticateToken, (req, res) => {
    let { full_name, study, whatsapp_mobile, email_id, address, shift, shift_timing, seat_number, duration_months } = req.body;

    shift = shift ? parseInt(shift) : 1;
    if (!shift_timing) shift_timing = shift === 1 ? '08:00 AM - 12:00 PM' : shift === 2 ? '12:00 PM - 04:00 PM' : '04:00 PM - 08:00 PM';
    const months = duration_months ? parseInt(duration_months) : 1;

    const processAdmission = async (assignedSeat) => {
        const admissionDateStr = new Date().toISOString().slice(0, 10);
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + months);
        const expiryDateStr = expDate.toISOString().slice(0, 10);

        const sql = `INSERT INTO admissions (full_name, study, whatsapp_mobile, email_id, address, shift, shift_timing, seat_number, admission_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [full_name, study, whatsapp_mobile, email_id, address, shift, shift_timing, assignedSeat, admissionDateStr, expiryDateStr], async function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ success: false, message: 'Mobile number or email is already registered!' });
                }
                return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
            }

            const studentData = { 
                id: this.lastID, full_name, study, whatsapp_mobile, email_id, 
                shift, shift_timing, seat_number: assignedSeat, 
                admission_date: admissionDateStr, expiry_date: expiryDateStr, 
                library_fee: 500 * months, admission_fee: 100, security_deposit: 200, discount: 50 
            };

            try {
                const pdfBuffer = await createReceiptPDF(studentData);

                // Email dispatch
                gmailTransporter.sendMail({
                    from: `"Durga Digital Library" <${GMAIL_USER}>`,
                    to: email_id,
                    subject: `Admission Receipt - ${full_name} (Seat ${assignedSeat})`,
                    text: `Hello ${full_name},\nYour admission is confirmed.\nAssigned Seat: ${assignedSeat}`,
                    html: generateReceiptHTML(studentData),
                    attachments: [{ filename: `Receipt_${assignedSeat}.pdf`, content: pdfBuffer }]
                });

                // WhatsApp dispatch
                let cleanMobile = whatsapp_mobile.replace(/[^0-9]/g, '');
                if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;
                const chatId = `${cleanMobile}@c.us`;

                const waMessage = `*DURGA DIGITAL LIBRARY - ADMISSION RECEIPT* 💐\n----------------------------------------\n*Student Name:* ${full_name}\n*Assigned Seat:* ${assignedSeat}\n*Shift:* Shift ${shift} (${shift_timing})\n*Valid Until:* ${expiryDateStr}\n----------------------------------------\nThank you for joining Durga Digital Library!`;

                await whatsappClient.sendMessage(chatId, waMessage);
                const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), `Receipt_${assignedSeat}.pdf`);
                await whatsappClient.sendMessage(chatId, media);

            } catch (err) {
                console.error("⚠️ Background notification error:", err.message);
            }

            return res.status(201).json({ 
                success: true, 
                message: `Admission Success! Assigned Seat: ${assignedSeat}.`, 
                studentId: studentData.id
            });
        });
    };

    if (!seat_number) {
        db.all(`SELECT seat_number FROM admissions WHERE shift = ? AND status = 'ACTIVE'`, [shift], (err, bookedSeats) => {
            const bookedSet = new Set(bookedSeats ? bookedSeats.map(b => b.seat_number) : []);
            let availableSeat = null;

            for (let i = 1; i <= 25; i++) {
                if (!bookedSet.has(`S-${i}`)) {
                    availableSeat = `S-${i}`;
                    break;
                }
            }

            if (!availableSeat) return res.status(400).json({ success: false, message: `Shift ${shift} is full!` });
            processAdmission(availableSeat);
        });
    } else {
        processAdmission(seat_number);
    }
});

// Notifications API
app.get('/api/v1/notifications/expired', authenticateToken, async (req, res) => {
    await checkAndUpdateExpiryStatus();
    const today = new Date().toISOString().slice(0, 10);
    
    const sql = `
        SELECT *, 
        CASE WHEN expiry_date < ? THEN 'EXPIRED' ELSE 'EXPIRING_SOON' END AS alert_type
        FROM admissions 
        WHERE expiry_date <= DATE(?, '+2 days') AND status != 'CANCELLED'
        ORDER BY expiry_date ASC
    `;

    db.all(sql, [today, today], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, count: rows ? rows.length : 0, notifications: rows || [] });
    });
});

// Public Receipt View
app.get('/api/v1/admissions/:id/receipt', (req, res) => {
    db.get(`SELECT * FROM admissions WHERE id = ?`, [req.params.id], (err, student) => {
        if (err || !student) return res.status(404).send('Receipt Not Found');
        res.setHeader('Content-Type', 'text/html');
        res.send(`<!DOCTYPE html><html><head><title>Receipt</title></head><body style="background:#f1f5f9; padding:20px;"><div style="text-align:center; margin-bottom:15px;"><button onclick="window.print()" style="background:#1e3a8a; color:#fff; padding:10px 20px; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Print Receipt</button></div>${generateReceiptHTML(student)}</body></html>`);
    });
});

// Public PDF View
app.get('/api/v1/admissions/:id/pdf', (req, res) => {
    db.get(`SELECT * FROM admissions WHERE id = ?`, [req.params.id], async (err, student) => {
        if (err || !student) return res.status(404).send('Student Not Found');
        try {
            const pdfBuffer = await createReceiptPDF(student);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Receipt_${student.id}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            res.status(500).send("Error generating PDF");
        }
    });
});

app.listen(3000, () => console.log('🚀 Durga Library Admin Server Running on http://localhost:3000'));