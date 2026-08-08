import express from 'express';
import { authMiddleware, requireStudent } from '../middlewares/authMiddleware.js';
import * as portalController from '../controllers/studentPortalController.js';

const router = express.Router();

// All student portal routes require authentication and student role
router.use(authMiddleware, requireStudent);

// Dashboard
router.get('/dashboard', portalController.getDashboardController);

// Profile
router.get('/profile', portalController.getProfileController);
router.put('/profile', portalController.updateProfileController);

// ID Card
router.get('/id-card', portalController.getIdCardController);

// Membership
router.get('/membership', portalController.getMembershipController);

// Attendance
router.get('/attendance', portalController.getAttendanceController);

// Payments
router.get('/payments', portalController.getPaymentsController);
router.get('/receipts/:paymentId', portalController.downloadReceiptController);

// Notifications
router.get('/notifications', portalController.getNotificationsController);
router.post('/notifications/read', portalController.markNotificationsReadController);

// Announcements
router.get('/announcements', portalController.getAnnouncementsController);

export default router;
