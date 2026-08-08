import express from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { renewMembershipSchema } from '../validators/membershipValidator.js';
import * as studentController from '../controllers/studentController.js';
import * as membershipController from '../controllers/membershipController.js';
import * as attendanceController from '../controllers/attendanceController.js';
import * as announcementController from '../controllers/announcementController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware, requireAdmin);

// Dashboard
router.get('/stats', studentController.getDashboardStatsController);

// Students
router.get('/students', studentController.listStudentsController);
router.get('/students/:id', studentController.getStudentController);
router.put('/students/:id', studentController.updateStudentController);
router.delete('/students/:id', studentController.deactivateStudentController);
router.get('/audit-logs', studentController.getAuditLogsController);

// Memberships
router.post('/memberships/renew', validate(renewMembershipSchema), membershipController.renewMembershipController);
router.get('/memberships/expiring', membershipController.getExpiringSoonController);
router.get('/memberships/:studentId/history', membershipController.getMembershipHistoryController);
router.get('/memberships/:studentId/current', membershipController.getCurrentMembershipController);

// Attendance
router.get('/attendance', attendanceController.listAttendanceController);
router.get('/attendance/stats', attendanceController.getAttendanceStatsController);
router.post('/attendance', attendanceController.markAttendanceController);
router.post('/attendance/scan', attendanceController.scanQrAttendanceController);
router.get('/attendance/scan', attendanceController.scanQrAttendanceController);
router.delete('/attendance/:id', attendanceController.deleteAttendanceController);

// Announcements
router.get('/announcements', announcementController.listAnnouncementsController);
router.post('/announcements', announcementController.createAnnouncementController);
router.put('/announcements/:id', announcementController.updateAnnouncementController);
router.delete('/announcements/:id', announcementController.deleteAnnouncementController);

export default router;
