const { getLogger } = require("../services/logger.service");
const config = require("../config/logger.config");

/**
 * Registra informações de startup da aplicação
 */
function logStartup(port) {
  const logger = getLogger();

  logger.info("Application starting", {
    app: config.app.name,
    version: config.app.version,
    env: config.app.env,
    hostname: config.app.hostname,
    service: config.app.service,
    port: port,
    nodeVersion: process.version,
    pid: process.pid,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    loki: {
      url: config.loki.url,
      enabled: true,
    },
  });
}

/**
 * Configura graceful shutdown
 */
function setupGracefulShutdown(server) {
  const logger = getLogger();

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`, {
      signal,
      pid: process.pid,
    });

    // Parar de aceitar novas conexões
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Fazer flush dos logs pendentes
    try {
      await logger.flush();
      logger.info("Logs flushed successfully");
    } catch (error) {
      console.error("Error flushing logs:", error);
    }

    // Encerrar processo
    process.exit(0);
  };

  // Capturar sinais de encerramento
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Capturar erros fatais
  process.on("uncaughtException", async (error) => {
    logger.error("Fatal error during shutdown", {
      error: error.message,
      stack: error.stack,
    });

    try {
      await logger.flush();
    } catch (flushError) {
      console.error("Error flushing logs during fatal error:", flushError);
    }

    process.exit(1);
  });
}

module.exports = {
  logStartup,
  setupGracefulShutdown,
};
