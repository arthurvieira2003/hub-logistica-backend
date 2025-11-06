const express = require("express");
const router = express.Router();

// Importando todas as rotas
const userRoutes = require("./user.routes");
const sessionRoutes = require("./session.routes");
const ouroNegroRoutes = require("./ouroNegro.route");
const alfaRoutes = require("./alfa.route");
const princesaRoutes = require("./princesa.route");
const frotaRoutes = require("./frota.route");
const cteRoutes = require("./cte.route");
const genericRoutes = require("./generic.route");
const dashboardRoutes = require("./dashboard.route");

// Função para registrar todas as rotas no app
const registerRoutes = (app) => {
  app.use("/user", userRoutes);
  app.use("/session", sessionRoutes);
  app.use("/ouroNegro", ouroNegroRoutes);
  app.use("/alfa", alfaRoutes);
  app.use("/princesa", princesaRoutes);
  app.use("/frota", frotaRoutes);
  app.use("/cte", cteRoutes);
  app.use("/generic", genericRoutes);
  app.use("/dashboard", dashboardRoutes);
};

module.exports = registerRoutes;

