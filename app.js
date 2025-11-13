const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = require("./config/cors.config");
const registerRoutes = require("./routes");
const sequelize = require("./config/database.config");

// Logger setup
const { getLogger } = require("./services/logger.service");
const {
  requestIdMiddleware,
  httpLoggerMiddleware,
} = require("./middleware/logger.middleware");
const {
  setupGlobalErrorHandlers,
  expressErrorHandler,
  notFoundHandler,
} = require("./utils/error.handler");
const {
  logStartup,
  setupGracefulShutdown,
} = require("./utils/startup.handler");

// Configurar handlers de erro globais
setupGlobalErrorHandlers();

require("./models");

// Middlewares básicos
app.use(cors(corsOptions));
app.use(express.json());

// Middlewares de logging (devem vir antes das rotas)
app.use(requestIdMiddleware);
app.use(httpLoggerMiddleware);

// Registrar rotas
registerRoutes(app);

// Handler para rotas não encontradas (deve vir antes do error handler)
app.use(notFoundHandler);

// Error handler global (deve ser o último middleware)
app.use(expressErrorHandler);

// Sincronizar banco de dados
const logger = getLogger();
sequelize
  .sync({ alter: false, force: false })
  .then(() => {
    logger.info("Tabelas sincronizadas com sucesso", {
      database: process.env.DB_NAME || "unknown",
    });
  })
  .catch((err) => {
    logger.error("Erro ao sincronizar tabelas", {
      error: err.message,
      stack: err.stack,
    });
  });

// Iniciar servidor
const PORT = process.env.PORT || 4010;
const server = app.listen(PORT, () => {
  logStartup(PORT);
});

// Configurar graceful shutdown
setupGracefulShutdown(server);
