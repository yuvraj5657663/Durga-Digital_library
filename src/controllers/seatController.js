const { initDB } = require('../config/db');

exports.getSeats = async (req, res) => {
  try {
    const db = await initDB();

    // 1. Shift query extract karein (default Shift 1)
    const shiftParam = req.query.shift || '1';

    // 2. Config se total seats fetch karein (Fallback: 40)
    let totalSeats = 40;
    try {
      const config = await db.get(`SELECT total_seats FROM config WHERE id=1`);
      if (config && config.total_seats) {
        totalSeats = config.total_seats;
      }
    } catch (e) {
      // Agar config table missing ho toh auto-fallback 40 par rahega
    }

    // 3. Current Shift ke students fetch karein
    // Query string/number dono matches ko support karti hai (e.g., '1' ya 'Shift 1')
    const students = await db.all(
      `SELECT * FROM students WHERE shift = ? OR shift LIKE ?`,
      [shiftParam, `%${shiftParam}%`]
    );

    // 4. Seat mapping ke liye object prepare karein
    const bookedMap = {};
    students.forEach(s => {
      // Seat code se numeric value extract karein (e.g., "DDL005" -> 5 ya direct integer)
      if (s.seatCode) {
        const seatNum = parseInt(s.seatCode.replace(/\D/g, ''), 10);
        if (!isNaN(seatNum)) {
          bookedMap[seatNum] = s;
        }
      }
    });

    const seats = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 5. Total seats ki grid list generate karein
    for (let i = 1; i <= totalSeats; i++) {
      const student = bookedMap[i];

      if (student) {
        const expiryStr = student.expiryDate || student.expiry_date;
        let daysLeft = 0;
        let status = 'booked';

        if (expiryStr) {
          const expDate = new Date(expiryStr);
          expDate.setHours(0, 0, 0, 0);
          daysLeft = Math.round((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

          if (daysLeft < 0) {
            status = 'expired';
          } else if (daysLeft <= 3) {
            status = 'expiring';
          }
        }

        // Seat Code Pad formatting (e.g., 1 -> "DDL001")
        const formattedCode = `DDL${String(i).padStart(3, '0')}`;

        seats.push({
          seat_number: i,
          seat_code: student.seatCode || formattedCode,
          status: status,
          is_booked: true,
          student_name: student.name,
          mobile: student.mobile,
          preparation: student.preparation,
          expiry_date: expiryStr,
          days_left: daysLeft
        });
      } else {
        const formattedCode = `DDL${String(i).padStart(3, '0')}`;
        seats.push({
          seat_number: i,
          seat_code: formattedCode,
          status: 'available',
          is_booked: false
        });
      }
    }

    return res.json({
      success: true,
      total: totalSeats,
      active: students.length,
      seats
    });

  } catch (err) {
    console.error('Error fetching seats:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getConfig = async (req, res) => {
  try {
    const db = await initDB();

    // Config Table safe check
    await db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY,
        total_seats INTEGER DEFAULT 40
      );
    `);

    let row = await db.get(`SELECT total_seats FROM config WHERE id=1`);
    if (!row) {
      await db.run(`INSERT INTO config (id, total_seats) VALUES (1, 40)`);
      row = { total_seats: 40 };
    }

    return res.json({ success: true, total_seats: row.total_seats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { total_seats } = req.body;
    if (!total_seats || isNaN(total_seats)) {
      return res.status(400).json({ message: 'Valid total_seats number is required' });
    }

    const db = await initDB();

    await db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY,
        total_seats INTEGER DEFAULT 40
      );
    `);

    await db.run(
      `INSERT INTO config (id, total_seats) VALUES (1, ?) 
       ON CONFLICT(id) DO UPDATE SET total_seats = excluded.total_seats`,
      [parseInt(total_seats)]
    );

    return res.json({ success: true, total_seats: parseInt(total_seats) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};