const winston = require("winston");
const axios = require("axios");
const config = require("../config/logger.config");
const { formatLogForLoki, extractErrorInfo } = require("../utils/logger.utils");

class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = "CLOSED";
    this.nextAttempt = Date.now();
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  canAttempt() {
    if (this.state === "CLOSED") {
      return true;
    }
    if (this.state === "OPEN") {
      if (Date.now() >= this.nextAttempt) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true;
  }
}

class LokiLogger {
  constructor() {
    this.batch = [];
    this.batchTimer = null;
    this.circuitBreaker = new CircuitBreaker(
      config.log.circuitBreakerThreshold,
      config.log.circuitBreakerTimeout
    );
    this.isShuttingDown = false;
    this.pendingFlush = null;

    this.winstonLogger = winston.createLogger({
      level: config.log.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });

    this.startBatchProcessor();
  }

  startBatchProcessor() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, config.log.batchInterval);
  }

  async log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    this.winstonLogger.log(level, message, metadata);

    if (this.isShuttingDown) {
      return;
    }

    this.batch.push(logEntry);

    if (this.batch.length >= config.log.batchSize) {
      await this.flushBatch();
    }
  }

  async flushBatch() {
    if (this.batch.length === 0) {
      return;
    }

    if (!this.circuitBreaker.canAttempt()) {
      this.winstonLogger.warn("Circuit breaker is OPEN, skipping Loki push");
      return;
    }

    const logsToSend = [...this.batch];
    this.batch = [];

    try {
      await this.sendToLoki(logsToSend);
      this.circuitBreaker.recordSuccess();
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.winstonLogger.error("Failed to send logs to Loki", {
        error: error.message,
        logsCount: logsToSend.length,
      });

      if (this.batch.length < config.log.batchSize * 2) {
        this.batch.unshift(...logsToSend);
      }
    }
  }

  validarLokiHabilitado() {
    return (
      config.loki.enabled && config.loki.url && config.loki.url.trim() !== ""
    );
  }

  agruparLogsEmStreams(logs) {
    const streams = {};
    for (const log of logs) {
      const formatted = formatLogForLoki(log);
      const streamKey = JSON.stringify(formatted.stream);

      if (!streams[streamKey]) {
        streams[streamKey] = {
          stream: formatted.stream,
          values: [],
        };
      }

      streams[streamKey].values.push(...formatted.values);
    }
    return streams;
  }

  criarPayload(streams) {
    return {
      streams: Object.values(streams),
    };
  }

  calcularDelay(attempt) {
    if (attempt === 0) {
      return 5000;
    }
    return config.log.retryDelay * Math.pow(2, attempt);
  }

  ehErroRecuperavel(error) {
    if (!error.response && !error.request) {
      return false;
    }

    const codigosRecuperaveis = [
      "ECONNABORTED",
      "EHOSTUNREACH",
      "ECONNREFUSED",
      "ETIMEDOUT",
    ];

    if (codigosRecuperaveis.includes(error.code)) {
      return true;
    }

    const mensagem = error.message || "";
    return mensagem.includes("timeout") || mensagem.includes("ENOTFOUND");
  }

  async aguardarDelay(delay) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async processarResposta503(response, attempt) {
    const lastError = new Error(
      `Loki ingester not ready (503), attempt ${attempt + 1}/${
        config.log.maxRetries
      }`
    );

    if (attempt < config.log.maxRetries - 1) {
      const delay = this.calcularDelay(attempt);
      await this.aguardarDelay(delay);
    }

    return lastError;
  }

  criarConfiguracaoRequisicao() {
    return {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
      validateStatus: (status) => {
        return status === 200 || status === 204 || status === 503;
      },
    };
  }

  async fazerRequisicaoComRetry(payload) {
    let lastError;

    for (let attempt = 0; attempt < config.log.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          config.loki.url,
          payload,
          this.criarConfiguracaoRequisicao()
        );

        if (response.status === 204 || response.status === 200) {
          return;
        }

        if (response.status === 503) {
          lastError = await this.processarResposta503(response, attempt);
          continue;
        }
      } catch (error) {
        lastError = error;

        if (!this.ehErroRecuperavel(error)) {
          throw error;
        }

        if (attempt < config.log.maxRetries - 1) {
          const delay = this.calcularDelay(attempt);
          await this.aguardarDelay(delay);
        }
      }
    }

    throw lastError || new Error("Failed to send logs to Loki after retries");
  }

  async sendToLoki(logs) {
    if (logs.length === 0) {
      return;
    }

    if (!this.validarLokiHabilitado()) {
      return;
    }

    const streams = this.agruparLogsEmStreams(logs);
    const payload = this.criarPayload(streams);
    await this.fazerRequisicaoComRetry(payload);
  }

  debug(message, metadata = {}) {
    return this.log("debug", message, metadata);
  }

  info(message, metadata = {}) {
    return this.log("info", message, metadata);
  }

  warn(message, metadata = {}) {
    return this.log("warn", message, metadata);
  }

  error(message, metadata = {}) {
    if (metadata.error instanceof Error) {
      metadata.error = extractErrorInfo(metadata.error);
    } else if (metadata instanceof Error) {
      metadata = {
        error: extractErrorInfo(metadata),
      };
    }

    return this.log("error", message, metadata);
  }

  async flush() {
    if (this.pendingFlush) {
      return this.pendingFlush;
    }

    this.pendingFlush = (async () => {
      this.isShuttingDown = true;

      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = null;
      }

      await this.flushBatch();

      this.pendingFlush = null;
    })();

    return this.pendingFlush;
  }

  async close() {
    await this.flush();
  }
}

let loggerInstance = null;

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new LokiLogger();
  }
  return loggerInstance;
}

module.exports = {
  LokiLogger,
  getLogger,
};
