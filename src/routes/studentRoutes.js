const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const auth = require("../middlewares/authMiddleware");

// Protected Student & Admission Management Routes
router.post("/admissions", auth, studentController.createAdmission);
router.get("/admin/students", auth, studentController.getStudents);
router.delete("/admin/students/:id", auth, studentController.cancelStudent);

// Public / Printable Receipt Route (Direct PDF Stream)
router.get("/admissions/:id/receipt", studentController.generateReceipt);

module.exports = router;