require("dotenv").config();
const os = require("os");

module.exports = {
  loki: {
    host: process.env.LOKI_HOST || "",
    port: process.env.LOKI_PORT || "3100",
    endpoint: process.env.LOKI_ENDPOINT || "/loki/api/v1/push",
    get url() {
      // Se LOKI_HOST não estiver definido, retornar string vazia para desabilitar Loki
      if (!this.host || this.host.trim() === "") {
        return "";
      }
      return `http://${this.host}:${this.port}${this.endpoint}`;
    },
    get enabled() {
      return !!(this.host && this.host.trim() !== "");
    },
  },
  app: {
    name: process.env.APP_NAME || "hub-logistica-backend",
    env: process.env.ENV || process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "1.0.0",
    hostname: os.hostname(),
    service: process.env.SERVICE_NAME || "api",
  },
  log: {
    level: process.env.LOG_LEVEL || "info",
    batchSize: parseInt(process.env.LOG_BATCH_SIZE || "10", 10),
    batchInterval: parseInt(process.env.LOG_BATCH_INTERVAL || "5000", 10),
    maxRetries: parseInt(process.env.LOG_MAX_RETRIES || "3", 10),
    retryDelay: parseInt(process.env.LOG_RETRY_DELAY || "1000", 10),
    circuitBreakerThreshold: parseInt(
      process.env.LOG_CIRCUIT_BREAKER_THRESHOLD || "5",
      10
    ),
    circuitBreakerTimeout: parseInt(
      process.env.LOG_CIRCUIT_BREAKER_TIMEOUT || "60000",
      10
    ),
  },
  sanitize: {
    sensitiveFields: [
      "password",
      "senha",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "apiKey",
      "apikey",
      "secret",
      "secretKey",
      "privateKey",
      "creditCard",
      "cardNumber",
      "cvv",
      "cvc",
    ],
  },
};
