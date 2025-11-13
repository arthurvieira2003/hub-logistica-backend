const { getLogger } = require("../services/logger.service");

/**
 * Global error handler para erros não capturados
 */
function setupGlobalErrorHandlers() {
  const logger = getLogger();

  // Capturar erros não tratados
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Dar tempo para o logger fazer flush antes de encerrar
    logger
      .flush()
      .then(() => {
        process.exit(1);
      })
      .catch(() => {
        process.exit(1);
      });
  });

  // Capturar promessas rejeitadas não tratadas
  process.on("unhandledRejection", (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));

    logger.error("Unhandled Rejection", {
      error: error.message,
      stack: error.stack,
      name: error.name,
      promise: promise.toString(),
    });
  });

  // Capturar avisos
  process.on("warning", (warning) => {
    logger.warn("Process Warning", {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });
}

/**
 * Middleware Express para tratamento de erros
 */
function expressErrorHandler(err, req, res, next) {
  const logger = getLogger();

  // Log do erro
  logger.error("Express Error Handler", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      statusCode: err.statusCode || err.status || 500,
    },
    userId: req.user?.id,
  });

  // Responder ao cliente
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? "Internal Server Error" : err.message;

  res.status(statusCode).json({
    error: {
      message,
      requestId: req.id,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}

/**
 * Handler para rotas não encontradas (404)
 */
function notFoundHandler(req, res, next) {
  const logger = getLogger();

  logger.warn("Route not found", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
  });

  res.status(404).json({
    error: {
      message: "Route not found",
      requestId: req.id,
      path: req.originalUrl || req.url,
    },
  });
}

module.exports = {
  setupGlobalErrorHandlers,
  expressErrorHandler,
  notFoundHandler,
};
