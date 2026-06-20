const express = require("express");
const router = express.Router();

const { isAuthenticated } = require("../middlewares/auth");
const pegawaiController = require("../controllers/pegawaiController");

// Semua route pegawai wajib login
router.use(isAuthenticated);

// =====================================================
// PERMOHONAN LEMBUR MANDIRI
// =====================================================
router.get("/permohonan", pegawaiController.formPermohonan);
router.post("/permohonan", pegawaiController.simpanPermohonan);

// Batal permohonan
router.post("/permohonan/:id/batal", pegawaiController.batalPermohonan);

// =====================================================
// DAFTAR TUGAS LEMBUR
// =====================================================
router.get("/tugas", pegawaiController.listTugas);

// Detail tugas lembur
router.get("/tugas/:id", pegawaiController.detailTugas);

// Export PDF daftar tugas
router.get("/tugas/export/pdf", pegawaiController.exportPdf);

// =====================================================
// LAPORAN LEMBUR
// =====================================================
router.get("/tugas/:id/lapor", pegawaiController.formLaporan);
router.post("/tugas/:id/lapor", pegawaiController.submitLaporan);

// =====================================================
// RIWAYAT LEMBUR
// =====================================================
router.get("/riwayat", pegawaiController.riwayatLembur);

// REST API Riwayat Lembur
router.get("/api/riwayat", pegawaiController.apiRiwayatLembur);

router.get("/export/pdf", pegawaiController.exportPdfRiwayat);

module.exports = router;
