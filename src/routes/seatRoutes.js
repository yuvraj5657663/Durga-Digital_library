const express = require("express");
const router = express.Router();
const seatController = require("../controllers/seatController");
const auth = require("../middlewares/authMiddleware");

// Protected Routes: Seats Management & Config
// Mounted at '/api/seats' or '/api' in server.js

router.get("/seats", auth, seatController.getSeats);
router.get("/admin/config", auth, seatController.getConfig);
router.post("/admin/config", auth, seatController.updateConfig);

module.exports = router;