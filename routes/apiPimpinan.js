const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const pimpinanController = require("../controllers/pimpinanController");

// Restrict all API routes in this router to authenticated users
router.use(isAuthenticated);

// REST API for pimpinan status penugasan (Habib)
router.get("/penugasan/status", pimpinanController.apiStatusPenugasan);

module.exports = router;
