const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const adminController = require("../controllers/adminController");

router.use(isAuthenticated);

// Halaman utama rekap (Merespons HTMX saat difilter)
router.get("/rekap", adminController.halamanRekap);

// Tombol Export Excel
router.get("/rekap/export", adminController.exportExcel);

// Jalur REST API Rekap Universal
router.get("/api/rekap-lembur", adminController.apiRekapLembur);

module.exports = router;