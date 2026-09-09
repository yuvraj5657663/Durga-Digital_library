import express from 'express';
import { authMiddleware, requireAdmin, requirePermission } from '../middlewares/authMiddleware.js';
import { publicWriteLimiter } from '../middlewares/rateLimitMiddleware.js';
import * as admissionInquiryController from '../controllers/admissionInquiryController.js';

const router = express.Router();

// Public route for creating admission inquiry
router.post('/inquiry', publicWriteLimiter, admissionInquiryController.createAdmissionInquiryController);

// Admin routes for managing admission inquiries
router.get('/admissions', authMiddleware, requireAdmin, requirePermission('ADMISSION_VIEW'), admissionInquiryController.listAdmissionInquiriesController);
router.get('/admissions/pending-count', authMiddleware, requireAdmin, requirePermission('ADMISSION_VIEW'), admissionInquiryController.getPendingCountController);
router.patch('/admissions/:id', authMiddleware, requireAdmin, requirePermission('ADMISSION_UPDATE'), admissionInquiryController.updateAdmissionInquiryController);
router.delete('/admissions/:id', authMiddleware, requireAdmin, requirePermission('ADMISSION_UPDATE'), admissionInquiryController.deleteAdmissionInquiryController);

export default router;