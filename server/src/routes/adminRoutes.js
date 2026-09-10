import express from 'express';
import { authMiddleware, requireAdmin, requirePermission, requireAllPermissions } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { renewMembershipSchema } from '../validators/membershipValidator.js';
import * as studentController    from '../controllers/studentController.js';
import * as membershipController from '../controllers/membershipController.js';
import * as attendanceController from '../controllers/attendanceController.js';
import * as announcementController from '../controllers/announcementController.js';
import * as admissionController  from '../controllers/admissionRequestController.js';
import * as renewalController   from '../controllers/renewalController.js';
import * as notificationController from '../controllers/notificationController.js';
import * as paymentController from '../controllers/paymentController.js';
import * as deviceController from '../controllers/deviceController.js';
import * as wifiSessionController from '../controllers/wifiSessionController.js';
import * as captivePortalController from '../controllers/captivePortalController.js';
import * as adminAnalyticsController from '../controllers/adminAnalyticsController.js';
import { SHIFT_CONFIG } from '../config/shiftConfig.js';
import Seat from '../models/Seat.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authMiddleware, requireAdmin);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/stats',           studentController.getDashboardStatsController);
router.get('/dashboard-stats', studentController.getDashboardStatsController);
router.post('/analytics/query', requirePermission('REPORT_VIEW'), adminAnalyticsController.answerAnalyticsController);

// ── Seat Matrix ───────────────────────────────────────────────────────────────
// Returns exactly 24 seats for the requested shift.
// Booked seats come from DB; missing numbers are filled as vacant.
router.get('/seats', requirePermission('STUDENT_VIEW'), async (req, res) => {
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

// ── Shift Configuration ───────────────────────────────────────────────────────
// Returns available shift configurations for dynamic filtering
router.get('/shifts', requirePermission('SETTINGS_MANAGE'), (req, res) => {
  try {
    const shifts = Object.entries(SHIFT_CONFIG).map(([key, config]) => ({
      key,
      name: config.name,
      startTime: config.startTime,
      endTime: config.endTime,
      description: config.description
    }));

    return res.json({ success: true, data: shifts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Students ──────────────────────────────────────────────────────────────────
router.post('/students',     requirePermission('STUDENT_CREATE'), studentController.createStudentController);
router.get('/students',      requirePermission('STUDENT_VIEW'), studentController.listStudentsController);
router.get('/students/:id',  requirePermission('STUDENT_VIEW'), studentController.getStudentController);
router.put('/students/:id',  requirePermission('STUDENT_UPDATE'), studentController.updateStudentController);
router.delete('/students/:id', requirePermission('STUDENT_UPDATE'), studentController.deactivateStudentController);
router.get('/audit-logs',    requirePermission('REPORT_VIEW'), studentController.getAuditLogsController);

// ── Memberships & Payments ────────────────────────────────────────────────────
router.post('/memberships/renew',                 requireAllPermissions('MEMBERSHIP_CREATE', 'PAYMENT_CREATE'), validate(renewMembershipSchema), membershipController.renewMembershipController);
router.get('/memberships/expiring',               requirePermission('MEMBERSHIP_VIEW'), membershipController.getExpiringSoonController);
router.get('/memberships/:studentId/history',     requirePermission('MEMBERSHIP_VIEW'), membershipController.getMembershipHistoryController);
router.get('/memberships/:studentId/current',     requirePermission('MEMBERSHIP_VIEW'), membershipController.getCurrentMembershipController);
router.get('/payments', requirePermission('PAYMENT_VIEW'), paymentController.listPaymentsController);
router.get('/payments/:id/receipt', requirePermission('PAYMENT_VIEW'), paymentController.downloadPaymentReceiptController);
router.post('/payments/:id/refund', requirePermission('PAYMENT_REFUND'), paymentController.refundPaymentController);

// ── Renewal Requests ────────────────────────────────────────────────────────
router.get('/renewal/requests',                 requirePermission('PAYMENT_VIEW'), renewalController.getRenewalRequestsController);
router.post('/renewal/:requestId/approve',       requireAllPermissions('MEMBERSHIP_CREATE', 'PAYMENT_CREATE'), renewalController.approveRenewalRequestController);
router.post('/renewal/:requestId/reject',        requirePermission('PAYMENT_UPDATE'), renewalController.rejectRenewalRequestController);
router.delete('/renewal/:requestId',              renewalController.deleteRenewalRequestController);

// ── Attendance ────────────────────────────────────────────────────────────────
router.get('/attendance',           requirePermission('ATTENDANCE_VIEW'), attendanceController.listAttendanceController);
router.get('/attendance/stats',     requirePermission('ATTENDANCE_VIEW'), attendanceController.getAttendanceStatsController);
router.post('/attendance',          requirePermission('ATTENDANCE_CREATE'), attendanceController.markAttendanceController);
router.post('/attendance/checkout',  requirePermission('ATTENDANCE_UPDATE'), attendanceController.checkoutAttendanceController);
router.post('/attendance/scan',     requirePermission('ATTENDANCE_CREATE'), attendanceController.scanQrAttendanceController);
router.get('/attendance/scan',      requirePermission('ATTENDANCE_VIEW'), attendanceController.scanQrAttendanceController);
router.delete('/attendance/:id',    requirePermission('ATTENDANCE_UPDATE'), attendanceController.deleteAttendanceController);

// ── Announcements ─────────────────────────────────────────────────────────────
router.get('/announcements',         requirePermission('NOTIFICATION_VIEW'), announcementController.listAnnouncementsController);
router.post('/announcements',        requirePermission('NOTIFICATION_SEND'), announcementController.createAnnouncementController);
router.put('/announcements/:id',     requirePermission('NOTIFICATION_SEND'), announcementController.updateAnnouncementController);
router.delete('/announcements/:id',  requirePermission('NOTIFICATION_SEND'), announcementController.deleteAnnouncementController);

// ── Online Admissions ─────────────────────────────────────────────────────────
router.get('/admissions',              requirePermission('ADMISSION_VIEW'), admissionController.getAdmissionRequestsController);
router.post('/admissions/:id/approve', requireAllPermissions('ADMISSION_APPROVE', 'PAYMENT_CREATE'), admissionController.approveAdmissionRequestController);
router.post('/admissions/:id/reject',  requirePermission('ADMISSION_REJECT'), admissionController.rejectAdmissionRequestController);

// ── Notifications ───────────────────────────────────────────────────────────────
router.get('/notifications',              requirePermission('NOTIFICATION_VIEW'), notificationController.getNotificationsController);
router.post('/notifications/test',        requirePermission('NOTIFICATION_SEND'), notificationController.createTestNotificationController);
router.patch('/notifications/read-all',  requirePermission('NOTIFICATION_VIEW'), notificationController.markAllAsReadController);
router.patch('/notifications/:id/read',  requirePermission('NOTIFICATION_VIEW'), notificationController.markAsReadController);
router.post('/notifications/:id/retry', requirePermission('NOTIFICATION_RETRY'), notificationController.retryNotificationController);
router.post('/notifications/reminders', requirePermission('NOTIFICATION_SEND'), notificationController.sendReminderController);

// ── Device Management ─────────────────────────────────────────────────────────────
router.get('/devices',                    requirePermission('WIFI_VIEW'), deviceController.getAllDevicesController);
router.get('/devices/:deviceId',          requirePermission('WIFI_VIEW'), deviceController.getDeviceController);
router.post('/devices/:deviceId/suspend', requirePermission('WIFI_MANAGE'), deviceController.suspendDeviceController);
router.post('/devices/:deviceId/restore', requirePermission('WIFI_MANAGE'), deviceController.restoreDeviceController);

// ── Wi-Fi Session Management ─────────────────────────────────────────────────────
router.get('/wifi/sessions',                    requirePermission('WIFI_VIEW'), wifiSessionController.getAllSessionsController);
router.get('/wifi/sessions/:sessionId',          requirePermission('WIFI_VIEW'), wifiSessionController.getSessionController);
router.post('/wifi/sessions/:sessionId/revoke', requirePermission('WIFI_MANAGE'), wifiSessionController.revokeSessionController);
router.post('/wifi/students/:studentId/sessions/revoke', requirePermission('WIFI_MANAGE'), wifiSessionController.revokeStudentSessionsController);

// ── Captive Portal Management ─────────────────────────────────────────────────────
router.get('/network/portal/sessions',                    requirePermission('WIFI_VIEW'), captivePortalController.getAllPortalSessionsController);
router.get('/network/portal/sessions/:portalSessionId',  requirePermission('WIFI_VIEW'), captivePortalController.getPortalSessionController);
router.post('/network/portal/sessions/:portalSessionId/expire', requirePermission('WIFI_MANAGE'), captivePortalController.expirePortalSessionController);

// ── Gateway Diagnostics ─────────────────────────────────────────────────────────────
router.get('/network/gateway/status', requirePermission('WIFI_VIEW'), captivePortalController.gatewayDiagnosticsController);
router.get('/network/gateway/readiness', requirePermission('WIFI_VIEW'), captivePortalController.gatewayReadinessController);
router.get('/network/gateway/health', requirePermission('WIFI_VIEW'), captivePortalController.gatewayHealthController);

export default router;
