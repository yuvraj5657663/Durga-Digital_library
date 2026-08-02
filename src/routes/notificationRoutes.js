const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const auth = require("../middlewares/authMiddleware");

// Protected Route: Fetch expired / expiring soon notifications
router.get("/expired", auth, notificationController.getExpired);
router.get("/alerts/expired", auth, notificationController.getExpired);

module.exports = router;