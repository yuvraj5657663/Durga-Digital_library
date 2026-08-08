import express from 'express';
import { validate } from '../middlewares/validationMiddleware.js';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '../validators/authValidator.js';
import { loginLimiter } from '../middlewares/rateLimitMiddleware.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.loginController);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshTokenController);
router.post('/logout', authController.logoutController);
router.get('/me', authController.meController);
router.post('/register', authController.registerController);
router.post('/change-password', validate(changePasswordSchema), authController.changePasswordController);

export default router;
