const express = require("express");
const router = express.Router();

// Importando todas as rotas
const userRoutes = require("./user.routes");
const sessionRoutes = require("./session.routes");
const ouroNegroRoutes = require("./ouroNegro.route");
const alfaRoutes = require("./alfa.route");
const princesaRoutes = require("./princesa.route");
const cteRoutes = require("./cte.route");
const genericRoutes = require("./generic.route");
const estadosRoutes = require("./estados.routes");
const cidadesRoutes = require("./cidades.routes");
const transportadorasRoutes = require("./transportadoras.routes");
const faixasPesoRoutes = require("./faixasPeso.routes");
const rotasRoutes = require("./rotas.routes");
const precosFaixasRoutes = require("./precosFaixas.routes");

// Função para registrar todas as rotas no app
const registerRoutes = (app) => {
  app.use("/user", userRoutes);
  app.use("/session", sessionRoutes);
  app.use("/ouroNegro", ouroNegroRoutes);
  app.use("/alfa", alfaRoutes);
  app.use("/princesa", princesaRoutes);
  app.use("/cte", cteRoutes);
  app.use("/generic", genericRoutes);
  app.use("/estados", estadosRoutes);
  app.use("/cidades", cidadesRoutes);
  app.use("/transportadoras", transportadorasRoutes);
  app.use("/faixas-peso", faixasPesoRoutes);
  app.use("/rotas", rotasRoutes);
  app.use("/precos-faixas", precosFaixasRoutes);
};

module.exports = registerRoutes;

