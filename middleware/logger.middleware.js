const { v4: uuidv4 } = require("uuid");
const { getLogger } = require("../services/logger.service");

/**
 * Middleware para adicionar request ID a cada requisição
 */
function requestIdMiddleware(req, res, next) {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
}

/**
 * Middleware para logging automático de requisições HTTP
 */
function httpLoggerMiddleware(req, res, next) {
  const logger = getLogger();
  const startTime = Date.now();

  // Capturar informações da requisição
  const requestInfo = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    headers: {
      "content-type": req.get("content-type"),
      accept: req.get("accept"),
    },
  };

  // Capturar user ID se disponível (assumindo que está em req.user após autenticação)
  if (req.user && req.user.id) {
    requestInfo.userId = req.user.id;
  }

  // Log da requisição recebida
  logger.info("HTTP Request received", requestInfo);

  // Capturar body da requisição (exceto para uploads grandes)
  if (req.body && Object.keys(req.body).length > 0) {
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize < 10000) {
      // Apenas logar bodies menores que 10KB
      requestInfo.requestBody = req.body;
    } else {
      requestInfo.requestBodySize = bodySize;
    }
  }

  // Interceptar o método end da resposta para capturar informações
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    res.end = originalEnd;

    const duration = Date.now() - startTime;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration,
      responseSize: res.get("content-length") || (chunk ? chunk.length : 0),
    };

    // Determinar nível de log baseado no status code
    let logLevel = "info";
    if (res.statusCode >= 500) {
      logLevel = "error";
    } else if (res.statusCode >= 400) {
      logLevel = "warn";
    }

    // Log da resposta
    logger.log(logLevel, "HTTP Request completed", responseInfo);

    // Chamar o método end original
    res.end(chunk, encoding);
  };

  // Capturar erros não tratados
  res.on("close", () => {
    if (!res.writableEnded) {
      const duration = Date.now() - startTime;
      logger.warn("HTTP Request closed without proper end", {
        ...requestInfo,
        duration,
      });
    }
  });

  next();
}

module.exports = {
  requestIdMiddleware,
  httpLoggerMiddleware,
};
