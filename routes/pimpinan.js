const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const { checkPermission } = require("../middlewares/acl");
const laporanController = require("../controllers/laporanController");
const pimpinanController = require("../controllers/pimpinanController");

// Semua route di sini butuh login
router.use(isAuthenticated);

// ── Fitur 13: List laporan lembur ─────────────────────────────────────────────
router.get(
  "/laporan",
  checkPermission("view_overtime_reports"),
  laporanController.listLaporan,
);

// ── Fitur 14: Detail laporan lembur ──────────────────────────────────────────
router.get(
  "/laporan/:id",
  checkPermission("view_overtime_reports"),
  laporanController.detailLaporan,
);

// -- Penugasan Lembur
router.get(
  "/penugasan/buat",
  checkPermission("create_overtime_assignments"),
  pimpinanController.formBuatPenugasan,
);

// ── Fitur 15: Konfirmasi laporan lembur ──────────────────────────────────────
router.post(
  "/laporan/:id/konfirmasi",
  checkPermission("approve_overtime_reports"),
  laporanController.konfirmasiLaporan,
);

// ── Fitur 16: Tolak laporan lembur dengan catatan revisi ─────────────────────
router.post(
  "/laporan/:id/tolak",
  checkPermission("approve_overtime_reports"),
  laporanController.tolakLaporan,
);

//Buat penugasan lembur
router.post(
  "/penugasan/buat",
  checkPermission("create_overtime_assignments"),
  pimpinanController.simpanPenugasan,
);

// ── Fitur 10: Pimpinan melihat daftar & detail penugasan (Muhammad Habib) ──
router.get(
  "/penugasan",
  checkPermission("view_overtime_assignments"),
  pimpinanController.listPenugasan,
);

router.get(
  "/penugasan/:id",
  checkPermission("view_overtime_assignments"),
  pimpinanController.detailPenugasan,
);

// ── Fitur 11: Pimpinan mengubah data penugasan lembur (Muhammad Habib) ──
router.get(
  "/penugasan/:id/edit",
  checkPermission("edit_overtime_assignments"),
  pimpinanController.formEditPenugasan,
);

router.post(
  "/penugasan/:id/edit",
  checkPermission("edit_overtime_assignments"),
  pimpinanController.updatePenugasan,
);

// ── Fitur 17: Pimpinan menghapus/membatalkan penugasan lembur (Darrel) ──
router.delete(
  "/penugasan/:id",
  checkPermission("edit_overtime_assignments"),
  pimpinanController.hapusPenugasan
);

module.exports = router;
