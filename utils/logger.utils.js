const config = require("../config/logger.config");

/**
 * Sanitiza dados sensíveis de um objeto
 * @param {any} data - Dados a serem sanitizados
 * @param {number} depth - Profundidade atual da recursão
 * @returns {any} - Dados sanitizados
 */
function sanitizeSensitiveData(data, depth = 0) {
  // Limitar profundidade para evitar loops infinitos
  if (depth > 10) {
    return "[Max depth reached]";
  }

  if (data === null || data === undefined) {
    return data;
  }

  // Se for string, verificar se contém dados sensíveis
  if (typeof data === "string") {
    // Verificar se a string parece ser um token ou hash
    if (data.length > 50 && /^[A-Za-z0-9+/=]+$/.test(data)) {
      return "***[token-like string]***";
    }
    return data;
  }

  // Se for array, sanitizar cada elemento
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSensitiveData(item, depth + 1));
  }

  // Se for objeto, sanitizar propriedades
  if (typeof data === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Verificar se a chave está na lista de campos sensíveis
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

/**
 * Gera um timestamp em nanosegundos
 * @returns {string} - Timestamp em nanosegundos
 */
function getNanoTimestamp() {
  return (Date.now() * 1000000).toString();
}

/**
 * Extrai informações do erro (stack trace, message, etc)
 * @param {Error} error - Objeto de erro
 * @returns {object} - Informações do erro
 */
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

  // Copiar outras propriedades relevantes
  if (error.name) {
    errorInfo.name = error.name;
  }

  return errorInfo;
}

/**
 * Gera labels dinâmicos para o Loki
 * @param {object} additionalLabels - Labels adicionais
 * @returns {object} - Labels completos
 */
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

/**
 * Formata um log para o formato esperado pelo Loki
 * @param {object} logEntry - Entrada de log
 * @returns {object} - Log formatado
 */
function formatLogForLoki(logEntry) {
  const { level, message, timestamp, ...metadata } = logEntry;

  // Sanitizar dados sensíveis
  const sanitizedMetadata = sanitizeSensitiveData(metadata);

  // Gerar labels
  const labels = generateLabels({
    level: level || "info",
  });

  // Criar linha de log em formato JSON
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
