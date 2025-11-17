const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = require("./config/cors.config");
const registerRoutes = require("./routes");
const sequelize = require("./config/database.config");

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

setupGlobalErrorHandlers();

require("./models");

app.use(cors(corsOptions));
app.use(express.json());

app.use(requestIdMiddleware);
app.use(httpLoggerMiddleware);

registerRoutes(app);

app.use(notFoundHandler);

app.use(expressErrorHandler);

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

const PORT = process.env.PORT || 4010;
const server = app.listen(PORT, () => {
  logStartup(PORT);

  if (process.env.SKIP_LOKI_DIAGNOSTICS !== "true") {
    setImmediate(() => {
      setTimeout(async () => {
        try {
          await testLokiConnection();
        } catch (error) {
          console.error("[Diagnóstico Loki] Erro ignorado:", error.message);
        }
      }, 1000);
    });
  } else {
    const logger = getLogger();
    logger.info("Diagnóstico do Loki pulado (SKIP_LOKI_DIAGNOSTICS=true)");
  }
});

setupGracefulShutdown(server);
