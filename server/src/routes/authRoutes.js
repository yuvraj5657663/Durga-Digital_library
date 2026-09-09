import express from 'express';
import { validate } from '../middlewares/validationMiddleware.js';
import { loginSchema, refreshTokenSchema, changePasswordSchema, passwordResetRequestSchema, passwordResetConfirmSchema } from '../validators/authValidator.js';
import { loginLimiter } from '../middlewares/rateLimitMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.loginController);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshTokenController);
router.post('/logout', authController.logoutController);
router.get('/me', authMiddleware, authController.meController);
router.post('/register', authController.registerController);
router.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePasswordController);
router.post('/password-reset/request', loginLimiter, validate(passwordResetRequestSchema), authController.requestPasswordResetController);
router.post('/password-reset/confirm', loginLimiter, validate(passwordResetConfirmSchema), authController.resetPasswordController);

export default router;
