const express = require("express");
const router = express.Router();

const { isAuthenticated } = require("../middlewares/auth");
const pegawaiController = require("../controllers/pegawaiController");

// Semua route pegawai wajib login
router.use(isAuthenticated);

// Form Permohonan Lembur
router.get("/permohonan", pegawaiController.formPermohonan);
router.post("/permohonan", pegawaiController.simpanPermohonan);

router.get("/riwayat", pegawaiController.riwayatLembur);

// REST API Riwayat Lembur
router.get("/api/riwayat", pegawaiController.apiRiwayatLembur);

router.get(
  "/export/pdf",
  pegawaiController.exportPdfRiwayat
);

module.exports = router;