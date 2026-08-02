const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// Public Routes: Login (Supports standard & admin endpoints)
router.post("/login", authController.login);
router.post("/admin/login", authController.login);

// Protected Route: Profile verification
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;