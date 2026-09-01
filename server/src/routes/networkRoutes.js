import express from 'express';
import { validate } from '../middlewares/validationMiddleware.js';
import { networkAuthSchema } from '../validators/networkValidator.js';
import * as networkController from '../controllers/networkController.js';
import * as wifiSessionController from '../controllers/wifiSessionController.js';
import * as captivePortalController from '../controllers/captivePortalController.js';

const router = express.Router();

// Network authentication endpoint for Wi-Fi gateway
router.post('/authenticate', validate(networkAuthSchema), networkController.authenticateNetworkController);

// Session validation endpoint for gateway/network components
router.post('/session/validate', wifiSessionController.validateSessionController);

// Session restoration for reconnection
router.post('/session/restore/:sessionId', wifiSessionController.restoreSessionController);

// Captive Portal endpoints
router.get('/portal', captivePortalController.portalEntryController);
router.post('/portal/authenticate', captivePortalController.portalAuthenticateController);
router.post('/portal/logout', captivePortalController.portalLogoutController);
router.get('/portal/status/:portalSessionId', captivePortalController.portalStatusController);

export default router;