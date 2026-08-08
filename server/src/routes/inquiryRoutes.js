import express from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';
import { publicWriteLimiter } from '../middlewares/rateLimitMiddleware.js';
import * as inquiryController from '../controllers/inquiryController.js';

const router = express.Router();

router.post('/', publicWriteLimiter, inquiryController.createInquiryController);
router.get('/', authMiddleware, requireAdmin, inquiryController.listInquiriesController);

export default router;
