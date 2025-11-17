const { v4: uuidv4 } = require("uuid");
const { getLogger } = require("../services/logger.service");

function requestIdMiddleware(req, res, next) {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
}

function httpLoggerMiddleware(req, res, next) {
  const logger = getLogger();
  const startTime = Date.now();

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

  if (req.user && req.user.id) {
    requestInfo.userId = req.user.id;
  }

  logger.info("HTTP Request received", requestInfo);

  if (req.body && Object.keys(req.body).length > 0) {
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize < 10000) {
      requestInfo.requestBody = req.body;
    } else {
      requestInfo.requestBodySize = bodySize;
    }
  }

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

    let logLevel = "info";
    if (res.statusCode >= 500) {
      logLevel = "error";
    } else if (res.statusCode >= 400) {
      logLevel = "warn";
    }

    logger.log(logLevel, "HTTP Request completed", responseInfo);

    res.end(chunk, encoding);
  };

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
