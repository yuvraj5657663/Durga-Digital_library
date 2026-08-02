const { initDB } = require('../config/db');

exports.getExpired = async (req, res) => {
  try {
    const db = await initDB();
    
    // 1. Database se active students fetch karein
    const rows = await db.all(`SELECT * FROM students`);

    // 2. Normalized Today Date (Midnight Reset)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = [];

    rows.forEach(r => {
      const expiryStr = r.expiryDate || r.expiry_date;

      if (expiryStr) {
        // Safe ISO String Date Parsing
        const [year, month, day] = expiryStr.split('-').map(Number);
        const expDate = year && month && day 
          ? new Date(year, month - 1, day) 
          : new Date(expiryStr);

        expDate.setHours(0, 0, 0, 0);

        // Days Left Calculation
        const diffTime = expDate.getTime() - today.getTime();
        const daysLeft = Math.round(diffTime / (1000 * 3600 * 24));

        // Expired (daysLeft < 0) ya अगले 5 din me expire hone waale alerts
        if (daysLeft <= 5) {
          notifications.push({
            id: r.id,
            name: r.name,
            mobile: r.mobile,
            seat_code: r.seatCode || r.seat_code || 'N/A',
            shift: r.shift,
            expiry_date: expiryStr,
            days_left: daysLeft,
            alert_type: daysLeft < 0 ? 'EXPIRED' : (daysLeft === 0 ? 'EXPIRING_TODAY' : 'EXPIRING_SOON')
          });
        }
      }
    });

    // 3. Sort by urgency (Expired pehle, phir upcoming expiry)
    notifications.sort((a, b) => a.days_left - b.days_left);

    // 4. Return standard response compatible with both API styles
    return res.json({ 
      success: true,
      count: notifications.length,
      alerts: notifications,         // Frontend app.js compatibility
      notifications: notifications  // Existing route compatibility
    });

  } catch (err) {
    console.error('Error fetching expired alerts:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};