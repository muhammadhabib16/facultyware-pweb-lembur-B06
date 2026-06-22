const express = require("express");
const router = express.Router();

const { isAuthenticated } = require("../middlewares/auth");
const pegawaiController = require("../controllers/pegawaiController");

// Semua route pegawai wajib login
router.use(isAuthenticated);

// Form Permohonan Lembur
router.get("/permohonan", pegawaiController.formPermohonan);
router.post("/permohonan", pegawaiController.simpanPermohonan);

<<<<<<< HEAD
router.get("/riwayat/:id/detail", pegawaiController.detailRiwayat);
router.get("/riwayat", pegawaiController.riwayatLembur);

// Membatalkan Permohonan Lembur
router.post("/riwayat/:id/batalkan", isAuthenticated, pegawaiController.batalkanPermohonan);

router.get("/laporan/:id", isAuthenticated, pegawaiController.formLaporan);
router.post("/laporan/:id", isAuthenticated, pegawaiController.simpanLaporan);

// REST API Riwayat Lembur
router.get("/api/riwayat", pegawaiController.apiRiwayatLembur);
=======
// Fitur 3: Batal permohonan mandiri (sebelum dilaporkan)
router.post("/permohonan/:id/batal", pegawaiController.batalPermohonan);

// Fitur 1 & 3 & 4: Daftar & Pencarian Tugas Lembur
router.get("/tugas", pegawaiController.listTugas);

// Fitur Export PDF & Excel
router.get("/tugas/export/pdf", pegawaiController.exportPdf);
router.get("/tugas/export/excel", pegawaiController.exportExcel);

// Fitur 2: Detail tugas
router.get("/tugas/:id", pegawaiController.detailTugas);

// Fitur 2: Pelaporan kerja aktual
router.get("/tugas/:id/lapor", pegawaiController.formLaporan);
router.post("/tugas/:id/lapor", pegawaiController.submitLaporan);

// Fitur 4 & 8: Riwayat lembur (status waiting_approval, approved, rejected)
router.get("/riwayat", pegawaiController.riwayatLembur);
>>>>>>> dev

router.get(
  "/export/pdf",
  pegawaiController.exportPdfRiwayat
);

module.exports = router;
