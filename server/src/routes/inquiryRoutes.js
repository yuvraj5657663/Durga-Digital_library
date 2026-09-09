import express from 'express';
import { authMiddleware, requireAdmin, requirePermission } from '../middlewares/authMiddleware.js';
import { publicWriteLimiter } from '../middlewares/rateLimitMiddleware.js';
import * as inquiryController from '../controllers/inquiryController.js';

const router = express.Router();

router.post('/', publicWriteLimiter, inquiryController.createInquiryController);
router.get('/', authMiddleware, requireAdmin, requirePermission('ADMISSION_VIEW'), inquiryController.listInquiriesController);

export default router;
