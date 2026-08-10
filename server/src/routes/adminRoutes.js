import express from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { renewMembershipSchema } from '../validators/membershipValidator.js';
import * as studentController    from '../controllers/studentController.js';
import * as membershipController from '../controllers/membershipController.js';
import * as attendanceController from '../controllers/attendanceController.js';
import * as announcementController from '../controllers/announcementController.js';
import * as admissionController  from '../controllers/admissionRequestController.js';
import Seat from '../models/Seat.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authMiddleware, requireAdmin);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/stats',           studentController.getDashboardStatsController);
router.get('/dashboard-stats', studentController.getDashboardStatsController);

// ── Seat Matrix ───────────────────────────────────────────────────────────────
// Returns exactly 24 seats for the requested shift.
// Booked seats come from DB; missing numbers are filled as vacant.
router.get('/seats', async (req, res) => {
  try {
    const shift = req.query.shift || 'Shift 1'; // Default to Shift 1

    const bookedSeats = await Seat.find({ shift }).lean();
    const bookedMap   = {};
    bookedSeats.forEach(s => { bookedMap[s.seat_number] = s; });

    const seatArray = [];
    for (let i = 1; i <= 24; i++) {
      const booked = bookedMap[i];
      const code   = `DDL${String(i).padStart(3, '0')}`;
      if (booked) {
        seatArray.push({
          seat_number:  i,
          seat_code:    code,
          is_booked:    true,
          student_name: booked.student_name || '',
          mobile:       booked.mobile        || '',
          preparation:  booked.preparation   || '',
          expiry_date:  booked.expiry_date   || '',
          shift,
          shift_name:  booked.shift_name || shift,
          custom_timing: booked.custom_timing || ''
        });
      } else {
        seatArray.push({
          seat_number:  i,
          seat_code:    code,
          is_booked:    false,
          student_name: '',
          mobile:       '',
          preparation:  '',
          expiry_date:  '',
          shift,
          shift_name: shift,
          custom_timing: ''
        });
      }
    }

    return res.json({ success: true, data: seatArray, count: seatArray.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Students ──────────────────────────────────────────────────────────────────
router.post('/students',     studentController.createStudentController);
router.get('/students',      studentController.listStudentsController);
router.get('/students/:id',  studentController.getStudentController);
router.put('/students/:id',  studentController.updateStudentController);
router.delete('/students/:id', studentController.deactivateStudentController);
router.get('/audit-logs',    studentController.getAuditLogsController);

// ── Memberships & Payments ────────────────────────────────────────────────────
router.post('/memberships/renew',                 validate(renewMembershipSchema), membershipController.renewMembershipController);
router.get('/memberships/expiring',               membershipController.getExpiringSoonController);
router.get('/memberships/:studentId/history',     membershipController.getMembershipHistoryController);
router.get('/memberships/:studentId/current',     membershipController.getCurrentMembershipController);

// ── Attendance ────────────────────────────────────────────────────────────────
router.get('/attendance',         attendanceController.listAttendanceController);
router.get('/attendance/stats',   attendanceController.getAttendanceStatsController);
router.post('/attendance',        attendanceController.markAttendanceController);
router.post('/attendance/scan',   attendanceController.scanQrAttendanceController);
router.get('/attendance/scan',    attendanceController.scanQrAttendanceController);
router.delete('/attendance/:id',  attendanceController.deleteAttendanceController);

// ── Announcements ─────────────────────────────────────────────────────────────
router.get('/announcements',         announcementController.listAnnouncementsController);
router.post('/announcements',        announcementController.createAnnouncementController);
router.put('/announcements/:id',     announcementController.updateAnnouncementController);
router.delete('/announcements/:id',  announcementController.deleteAnnouncementController);

// ── Online Admissions ─────────────────────────────────────────────────────────
router.get('/admissions',              admissionController.getAdmissionRequestsController);
router.post('/admissions/:id/approve', admissionController.approveAdmissionRequestController);
router.post('/admissions/:id/reject',  admissionController.rejectAdmissionRequestController);

export default router;
