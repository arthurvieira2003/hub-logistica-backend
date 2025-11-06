const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const sessionMiddleware = require("../middleware/session.middleware");

// Rota para obter estatísticas do dashboard
router.get(
  "/stats",
  sessionMiddleware.ensureSessionLoaded,
  dashboardController.getDashboardStats
);

module.exports = router;
