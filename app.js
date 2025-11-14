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
  testLokiConnection,
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

  // Executar testes de diagnóstico do Loki em background (não bloqueia o startup)
  // Qualquer erro é ignorado para não afetar o funcionamento do backend
  if (process.env.SKIP_LOKI_DIAGNOSTICS !== "true") {
    // Executar em background sem bloquear
    setImmediate(() => {
      setTimeout(async () => {
        try {
          await testLokiConnection();
        } catch (error) {
          // Erro silencioso - não afeta o funcionamento do backend
          // Apenas loga localmente sem enviar para o Loki (para evitar loop)
          console.error("[Diagnóstico Loki] Erro ignorado:", error.message);
        }
      }, 1000);
    });
  } else {
    const logger = getLogger();
    logger.info("Diagnóstico do Loki pulado (SKIP_LOKI_DIAGNOSTICS=true)");
  }
});

// Configurar graceful shutdown
setupGracefulShutdown(server);
