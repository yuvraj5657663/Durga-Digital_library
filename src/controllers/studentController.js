const { initDB } = require('../config/db');
const PDFDocument = require('pdfkit');

exports.createAdmission = async (req, res) => {
  try {
    const {
      name, full_name,
      mobile, whatsapp_mobile,
      email,
      seatCode, seat_number,
      shift,
      duration, duration_months,
      joiningDate, joining_date,
      preparation,
      fee, fee_amount,
      shiftHours
    } = req.body;

    // Field Fallbacks for flexible API payloads
    const studentName = name || full_name;
    const studentMobile = mobile || whatsapp_mobile;
    const studentSeat = seatCode || (seat_number ? `DDL${String(seat_number).padStart(3, '0')}` : 'DDL001');
    const studentDuration = duration || duration_months || '1';
    const startJoiningDate = joiningDate || joining_date || new Date().toISOString().slice(0, 10);
    const studentFee = fee || fee_amount || 0;

    if (!studentName || !studentMobile) {
      return res.status(400).json({ success: false, message: 'Name and Mobile number are required.' });
    }

    // Expiry Date Calculation
    const joining = new Date(startJoiningDate);
    joining.setMonth(joining.getMonth() + parseInt(studentDuration, 10));
    const expiryDate = joining.toISOString().slice(0, 10);

    const db = await initDB();

    const query = `
      INSERT INTO students 
      (seatCode, name, email, mobile, preparation, duration, joiningDate, expiryDate, fee, shift, shiftHours) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.run(query, [
      studentSeat,
      studentName,
      email || '',
      studentMobile,
      preparation || 'General',
      String(studentDuration),
      startJoiningDate,
      expiryDate,
      parseFloat(studentFee),
      shift || 'Shift 1',
      shiftHours || '6 AM - 12 PM'
    ]);

    return res.json({
      success: true,
      message: 'Admission created successfully!',
      student: {
        id: result.lastID,
        seatCode: studentSeat,
        name: studentName,
        mobile: studentMobile,
        email: email || '',
        shift: shift || 'Shift 1',
        duration: studentDuration,
        joiningDate: startJoiningDate,
        expiryDate: expiryDate,
        fee: studentFee
      }
    });

  } catch (err) {
    console.error('Error creating admission:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const search = req.query.search || '';
    const shift = req.query.shift || '';

    const db = await initDB();

    let query = `SELECT * FROM students WHERE (name LIKE ? OR mobile LIKE ? OR seatCode LIKE ?)`;
    const params = [`%${search}%`, `%${search}%`, `%${search}%`];

    if (shift) {
      query += ` AND (shift = ? OR shift LIKE ?)`;
      params.push(shift, `%${shift}%`);
    }

    query += ` ORDER BY id DESC`;

    const rows = await db.all(query, params);

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (err) {
    console.error('Error fetching students:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelStudent = async (req, res) => {
  try {
    const db = await initDB();
    const studentId = req.params.id;

    const result = await db.run(`DELETE FROM students WHERE id=?`, [studentId]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    return res.json({ success: true, message: 'Student record deleted successfully.' });

  } catch (err) {
    console.error('Error cancelling student:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateReceipt = async (req, res) => {
  try {
    const db = await initDB();
    const s = await db.get(`SELECT * FROM students WHERE id=?`, [req.params.id]);

    if (!s) {
      return res.status(404).send('Receipt record not found');
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=receipt_${s.id}.pdf`);
    doc.pipe(res);

    // Header Section
    doc.fillColor('#881337').fontSize(22).text('DURGA DIGITAL LIBRARY', { align: 'center' }).moveDown(0.2);
    doc.fillColor('#64748b').fontSize(10).text('KALARAMPUR - MUNGER', { align: 'center' }).moveDown(1);
    
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);

    doc.fillColor('#0f172a').fontSize(14).text(`OFFICIAL PAYMENT RECEIPT #${s.id}`, { align: 'center' }).moveDown(1.5);

    // Details Grid Layout
    doc.fontSize(11).fillColor('#1e293b');
    doc.text(`Student Name : ${s.name}`);
    doc.text(`Mobile No.   : +91 ${s.mobile}`);
    doc.text(`Email        : ${s.email || 'N/A'}`);
    doc.text(`Seat Number  : ${s.seatCode || 'Unassigned'}`);
    doc.text(`Shift        : ${s.shift || 'Shift 1'}`);
    doc.text(`Joining Date : ${s.joiningDate}`);
    doc.text(`Valid Until  : ${s.expiryDate}`);
    doc.text(`Duration     : ${s.duration} Month(s)`);
    doc.text(`Fee Amount   : Rs. ${s.fee || 0}/-`);
    doc.moveDown(2);

    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1.5);

    doc.fontSize(10).fillColor('#047857').text('Thank you for choosing Durga Digital Library!', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('Error generating PDF receipt:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};