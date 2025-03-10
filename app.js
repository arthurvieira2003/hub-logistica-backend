const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = require("./config/cors.config");

const userRoutes = require("./routes/user.routes");
const sessionRoutes = require("./routes/session.routes");

app.use(cors(corsOptions));
app.use(express.json());

app.use("/user", userRoutes);
app.use("/session", sessionRoutes);
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
