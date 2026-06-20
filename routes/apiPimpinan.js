const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const pimpinanController = require("../controllers/pimpinanController");
const laporanController = require("../controllers/laporanController");

// Restrict all API routes in this router to authenticated users
router.use(isAuthenticated);

// REST API for pimpinan status penugasan (Habib)
router.get("/penugasan/status", pimpinanController.apiStatusPenugasan);

// REST API for laporan statistik (Hasyfi)
router.get("/laporan/statistik", laporanController.apiStatistikLaporan);

module.exports = router;
