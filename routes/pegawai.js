const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const pegawaiController = require("../controllers/pegawaiController");

// Seluruh rute pegawai memerlukan login terlebih dahulu
router.use(isAuthenticated);

// Rute untuk Fitur 1 (Pengajuan Permohonan Lembur Mandiri)
router.get("/permohonan", pegawaiController.formPermohonan);
router.post("/permohonan", pegawaiController.simpanPermohonan);

module.exports = router;
