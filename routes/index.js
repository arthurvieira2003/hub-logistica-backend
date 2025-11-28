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

const registerRoutes = (app) => {
  app.use("/api/user", userRoutes);
  app.use("/api/session", sessionRoutes);
  app.use("/api/ouroNegro", ouroNegroRoutes);
  app.use("/api/alfa", alfaRoutes);
  app.use("/api/princesa", princesaRoutes);
  app.use("/api/cte", cteRoutes);
  app.use("/api/generic", genericRoutes);
  app.use("/api/estados", estadosRoutes);
  app.use("/api/cidades", cidadesRoutes);
  app.use("/api/transportadoras", transportadorasRoutes);
  app.use("/api/faixas-peso", faixasPesoRoutes);
  app.use("/api/rotas", rotasRoutes);
  app.use("/api/precos-faixas", precosFaixasRoutes);
};

module.exports = registerRoutes;
