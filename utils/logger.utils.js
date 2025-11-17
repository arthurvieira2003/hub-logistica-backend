const config = require("../config/logger.config");

function sanitizeSensitiveData(data, depth = 0) {
  if (depth > 10) {
    return "[Max depth reached]";
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    if (data.length > 50 && /^[A-Za-z0-9+/=]+$/.test(data)) {
      return "***[token-like string]***";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSensitiveData(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      if (
        config.sanitize.sensitiveFields.some((field) =>
          lowerKey.includes(field.toLowerCase())
        )
      ) {
        sanitized[key] = "***";
      } else {
        sanitized[key] = sanitizeSensitiveData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

function getNanoTimestamp() {
  return (Date.now() * 1000000).toString();
}

function extractErrorInfo(error) {
  if (!error) {
    return null;
  }

  const errorInfo = {
    message: error.message || String(error),
    type: error.constructor?.name || "Error",
  };

  if (error.stack) {
    errorInfo.stack = error.stack;
  }

  if (error.code) {
    errorInfo.code = error.code;
  }

  if (error.statusCode) {
    errorInfo.statusCode = error.statusCode;
  }

  if (error.name) {
    errorInfo.name = error.name;
  }

  return errorInfo;
}

function generateLabels(additionalLabels = {}) {
  return {
    app: config.app.name,
    env: config.app.env,
    version: config.app.version,
    hostname: config.app.hostname,
    service: config.app.service,
    ...additionalLabels,
  };
}

function formatLogForLoki(logEntry) {
  const { level, message, timestamp, ...metadata } = logEntry;

  const sanitizedMetadata = sanitizeSensitiveData(metadata);

  const labels = generateLabels({
    level: level || "info",
  });

  const logLine = JSON.stringify({
    timestamp: timestamp || new Date().toISOString(),
    level: level || "info",
    message: message || "",
    ...sanitizedMetadata,
  });

  return {
    stream: labels,
    values: [[getNanoTimestamp(), logLine]],
  };
}

module.exports = {
  sanitizeSensitiveData,
  getNanoTimestamp,
  extractErrorInfo,
  generateLabels,
  formatLogForLoki,
};
