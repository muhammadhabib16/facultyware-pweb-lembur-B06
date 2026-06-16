const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const pegawaiController = require("../controllers/pegawaiController");

// Restrict all API routes in this router to authenticated users
router.use(isAuthenticated);

// REST API for employee task search
router.get("/tugas/search", pegawaiController.apiCariTugas);

module.exports = router;
