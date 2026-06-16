const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const pegawaiController = require("../controllers/pegawaiController");

// Seluruh rute pegawai memerlukan login terlebih dahulu
router.use(isAuthenticated);

// Rute untuk Fitur 1 (Pengajuan Permohonan Lembur Mandiri)
router.get("/permohonan", pegawaiController.formPermohonan);
router.post("/permohonan", pegawaiController.simpanPermohonan);

// Fitur 3: Batal permohonan mandiri (sebelum dilaporkan)
router.post("/permohonan/:id/batal", pegawaiController.batalPermohonan);

// Fitur 5 & 7: Daftar tugas aktif (dari pimpinan atau permohonan sendiri yang belum selesai)
router.get("/tugas", pegawaiController.listTugasAktif);

// Fitur 6: Detail tugas
router.get("/tugas/:id", pegawaiController.detailTugas);

// Fitur 2: Pelaporan kerja aktual
router.get("/tugas/:id/lapor", pegawaiController.formLaporan);
router.post("/tugas/:id/lapor", pegawaiController.submitLaporan);

// Fitur 4 & 8: Riwayat lembur (status waiting_approval, approved, rejected)
router.get("/riwayat", pegawaiController.riwayatLembur);

module.exports = router;
