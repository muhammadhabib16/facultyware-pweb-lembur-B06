const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/acl');
const laporanController = require('../controllers/laporanController');

// Semua route di sini butuh login
router.use(isAuthenticated);

// ── Fitur 13: List laporan lembur ─────────────────────────────────────────────
router.get(
  '/laporan',
  checkPermission('view_overtime_reports'),
  laporanController.listLaporan
);

// ── Fitur 14: Detail laporan lembur ──────────────────────────────────────────
router.get(
  '/laporan/:id',
  checkPermission('view_overtime_reports'),
  laporanController.detailLaporan
);

// ── Fitur 15: Konfirmasi laporan lembur ──────────────────────────────────────
router.post(
  '/laporan/:id/konfirmasi',
  checkPermission('approve_overtime_reports'),
  laporanController.konfirmasiLaporan
);

// ── Fitur 16: Tolak laporan lembur dengan catatan revisi ─────────────────────
router.post(
  '/laporan/:id/tolak',
  checkPermission('approve_overtime_reports'),
  laporanController.tolakLaporan
);

module.exports = router;