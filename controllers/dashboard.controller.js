const dashboardService = require("../services/dashboard.service");

const getDashboardStats = async (req, res) => {
  try {
    const { period = "week" } = req.query;

    if (!["week", "month", "year"].includes(period)) {
      return res.status(400).json({
        error: "Período inválido. Use: week, month ou year",
      });
    }

    const stats = await dashboardService.getDashboardStats(period);

    res.json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    res.status(500).json({
      error: "Erro ao buscar estatísticas do dashboard",
      message: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};

