const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = require("./config/cors.config");
const registerRoutes = require("./routes");
const sequelize = require("./config/database.config");

require("./models");

app.use(cors(corsOptions));
app.use(express.json());

registerRoutes(app);

sequelize
  .sync({ alter: false, force: false })
  .then(() => {
    console.log("Tabelas sincronizadas com sucesso");
  })
  .catch((err) => {
    console.error("Erro ao sincronizar tabelas:", err);
  });

app.listen(4010, () => {
  console.log("Server rodando na porta 4010");
});
