const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const adminController = require("../controllers/adminController");

router.use(isAuthenticated);

// Halaman utama rekap (Merespons HTMX saat difilter)
router.get("/rekap", adminController.halamanRekap);

// Tombol Export Excel
router.get("/rekap/export", adminController.exportExcel);

// Kelola Pegawai
router.get("/pegawai", adminController.halamanPegawai);
router.get("/pegawai/tambah", adminController.halamanTambahPegawai);
router.post("/pegawai/tambah", adminController.simpanPegawai);

module.exports = router;