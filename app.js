const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = require("./config/cors.config");

// Importando os modelos
require("./models/user.model");
require("./models/session.model");

const userRoutes = require("./routes/user.routes");
const sessionRoutes = require("./routes/session.routes");
const ouroNegroRoutes = require("./routes/ouroNegro.route");
const alfaRoutes = require("./routes/alfa.route");
const princesaRoutes = require("./routes/princesa.route");
const frotaRoutes = require("./routes/frota.route");
const cteRoutes = require("./routes/cte.route");
const genericRoutes = require("./routes/generic.route");

app.use(cors(corsOptions));
app.use(express.json());

app.use("/user", userRoutes);
app.use("/session", sessionRoutes);
app.use("/ouroNegro", ouroNegroRoutes);
app.use("/alfa", alfaRoutes);
app.use("/princesa", princesaRoutes);
app.use("/frota", frotaRoutes);
app.use("/cte", cteRoutes);
app.use("/generic", genericRoutes);

const sequelize = require("./config/database.config");

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Tabelas sincronizadas com sucesso");
  })
  .catch((err) => {
    console.error("Erro ao sincronizar tabelas:", err);
  });

app.listen(4010, () => {
  console.log("Server rodando na porta 4010");
});
