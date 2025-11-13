const winston = require("winston");
const axios = require("axios");
const config = require("../config/logger.config");
const { formatLogForLoki, extractErrorInfo } = require("../utils/logger.utils");

/**
 * Circuit Breaker para evitar sobrecarga de requisições ao Loki
 */
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
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
    // HALF_OPEN
    return true;
  }
}

/**
 * Classe principal do Logger com integração ao Grafana Loki
 */
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

    // Criar logger Winston para fallback e logs locais
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

    // Iniciar processamento de batch
    this.startBatchProcessor();
  }

  /**
   * Inicia o processador de batch que envia logs periodicamente
   */
  startBatchProcessor() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, config.log.batchInterval);
  }

  /**
   * Adiciona um log ao batch
   * @param {string} level - Nível do log
   * @param {string} message - Mensagem do log
   * @param {object} metadata - Metadados adicionais
   */
  async log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    // Sempre logar localmente via Winston (fallback)
    this.winstonLogger.log(level, message, metadata);

    // Se estiver em shutdown, não adicionar ao batch
    if (this.isShuttingDown) {
      return;
    }

    // Adicionar ao batch
    this.batch.push(logEntry);

    // Se o batch atingir o tamanho máximo, enviar imediatamente
    if (this.batch.length >= config.log.batchSize) {
      await this.flushBatch();
    }
  }

  /**
   * Envia o batch de logs para o Loki
   */
  async flushBatch() {
    if (this.batch.length === 0) {
      return;
    }

    // Verificar circuit breaker
    if (!this.circuitBreaker.canAttempt()) {
      // Circuit breaker está aberto, descartar logs ou manter no batch
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

      // Re-adicionar logs ao batch para tentar novamente (limitado)
      if (this.batch.length < config.log.batchSize * 2) {
        this.batch.unshift(...logsToSend);
      }
    }
  }

  /**
   * Envia logs para o Loki com retry e backoff exponencial
   * @param {Array} logs - Array de logs para enviar
   */
  async sendToLoki(logs) {
    if (logs.length === 0) {
      return;
    }

    // Formatar logs para o formato do Loki
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

    const payload = {
      streams: Object.values(streams),
    };

    // Retry com backoff exponencial
    let lastError;
    for (let attempt = 0; attempt < config.log.maxRetries; attempt++) {
      try {
        const response = await axios.post(config.loki.url, payload, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 20000, // 20 segundos para dar tempo do ingester ficar pronto e lidar com latência de rede
          validateStatus: (status) => {
            // Aceitar 200, 204 e 503 (503 significa que o ingester ainda não está pronto, mas pode aceitar logs)
            return status === 200 || status === 204 || status === 503;
          },
        });

        // 200 e 204 são sucesso
        if (response.status === 204 || response.status === 200) {
          return; // Sucesso
        }

        // 503 significa que o ingester não está pronto ainda, mas o log pode ser aceito
        // Aguardar um pouco e tentar novamente
        if (response.status === 503) {
          lastError = new Error(
            `Loki ingester not ready (503), attempt ${attempt + 1}/${
              config.log.maxRetries
            }`
          );
          // Aguardar mais tempo para 503 (ingester precisa de ~15s após iniciar)
          const delay =
            attempt === 0 ? 5000 : config.log.retryDelay * Math.pow(2, attempt);
          if (attempt < config.log.maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue; // Tentar novamente
          }
        }
      } catch (error) {
        lastError = error;

        // Se não for erro de rede, não tentar novamente
        if (!error.response && !error.request) {
          throw error;
        }

        // Se for timeout ou erro de rede, aguardar antes de tentar novamente
        if (
          error.code === "ECONNABORTED" ||
          error.code === "EHOSTUNREACH" ||
          error.code === "ECONNREFUSED" ||
          error.code === "ETIMEDOUT" ||
          error.message.includes("timeout") ||
          error.message.includes("ENOTFOUND")
        ) {
          const delay = config.log.retryDelay * Math.pow(2, attempt);
          if (attempt < config.log.maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // Calcular delay com backoff exponencial
        const delay = config.log.retryDelay * Math.pow(2, attempt);

        // Aguardar antes da próxima tentativa (exceto na última)
        if (attempt < config.log.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Se todas as tentativas falharam, lançar o último erro
    throw lastError || new Error("Failed to send logs to Loki after retries");
  }

  /**
   * Log de debug
   */
  debug(message, metadata = {}) {
    return this.log("debug", message, metadata);
  }

  /**
   * Log de info
   */
  info(message, metadata = {}) {
    return this.log("info", message, metadata);
  }

  /**
   * Log de warn
   */
  warn(message, metadata = {}) {
    return this.log("warn", message, metadata);
  }

  /**
   * Log de error
   */
  error(message, metadata = {}) {
    // Se metadata contém um erro, extrair informações
    if (metadata.error instanceof Error) {
      metadata.error = extractErrorInfo(metadata.error);
    } else if (metadata instanceof Error) {
      metadata = {
        error: extractErrorInfo(metadata),
      };
    }

    return this.log("error", message, metadata);
  }

  /**
   * Flush de todos os logs pendentes (usado no graceful shutdown)
   */
  async flush() {
    if (this.pendingFlush) {
      return this.pendingFlush;
    }

    this.pendingFlush = (async () => {
      this.isShuttingDown = true;

      // Parar o timer de batch
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = null;
      }

      // Flush do batch final
      await this.flushBatch();

      this.pendingFlush = null;
    })();

    return this.pendingFlush;
  }

  /**
   * Fecha o logger e faz flush de todos os logs
   */
  async close() {
    await this.flush();
  }
}

// Singleton instance
let loggerInstance = null;

/**
 * Obtém a instância singleton do logger
 */
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
