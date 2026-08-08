import express from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';
import * as admissionController from '../controllers/admissionRequestController.js';

const router = express.Router();

router.post('/', admissionController.createAdmissionRequestController);
router.get('/', authMiddleware, requireAdmin, admissionController.getAdmissionRequestsController);
router.post('/accept/:id', authMiddleware, requireAdmin, admissionController.approveAdmissionRequestController);
router.post('/reject/:id', authMiddleware, requireAdmin, admissionController.rejectAdmissionRequestController);

export default router;
