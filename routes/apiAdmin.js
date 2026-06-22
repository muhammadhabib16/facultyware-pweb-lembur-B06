const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const adminController = require("../controllers/adminController");

// Restrict all API routes in this router to authenticated users
router.use(isAuthenticated);

// Jalur REST API Rekap Universal (Darrel)
router.get("/rekap-lembur", adminController.apiRekapLembur);

module.exports = router;
