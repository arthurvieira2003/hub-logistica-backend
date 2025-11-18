const { LokiLogger, getLogger } = require("../../services/logger.service");
const axios = require("axios");
const config = require("../../config/logger.config");

jest.mock("axios");

// Mock da configuração para habilitar o Loki nos testes
jest.mock("../../config/logger.config", () => ({
  loki: {
    host: "localhost",
    port: "3100",
    endpoint: "/loki/api/v1/push",
    url: "http://localhost:3100/loki/api/v1/push",
    enabled: true,
  },
  app: {
    name: "hub-logistica-backend-test",
    env: "test",
    version: "1.0.0",
    hostname: "test-host",
    service: "api",
  },
  log: {
    level: "info",
    batchSize: 10,
    batchInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
  },
  sanitize: {
    sensitiveFields: ["password", "token"],
  },
}));

describe("LokiLogger", () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new LokiLogger();
  });

  afterEach(async () => {
    if (logger) {
      await logger.close();
    }
  });

  describe("Logging methods", () => {
    it("should log debug messages", async () => {
      await logger.debug("Debug message", { key: "value" });
      expect(logger.batch.length).toBeGreaterThan(0);
    });

    it("should log info messages", async () => {
      await logger.info("Info message", { key: "value" });
      expect(logger.batch.length).toBeGreaterThan(0);
    });

    it("should log warn messages", async () => {
      await logger.warn("Warn message", { key: "value" });
      expect(logger.batch.length).toBeGreaterThan(0);
    });

    it("should log error messages", async () => {
      const error = new Error("Test error");
      await logger.error("Error message", { error });
      expect(logger.batch.length).toBeGreaterThan(0);
    });

    it("should extract error info when logging errors", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace";
      await logger.error("Error message", { error });

      const logEntry = logger.batch[0];
      expect(logEntry.error).toBeDefined();
      expect(logEntry.error.message).toBe("Test error");
      expect(logEntry.error.stack).toBe("Error stack trace");
    });
  });

  describe("Batch processing", () => {
    it("should add logs to batch", async () => {
      await logger.info("Test message");
      expect(logger.batch.length).toBe(1);
    });

    it("should flush batch when size limit is reached", async () => {
      axios.post.mockResolvedValue({ status: 204 });

      for (let i = 0; i < 10; i++) {
        await logger.info(`Message ${i}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(axios.post).toHaveBeenCalled();
    });
  });

  describe("Circuit breaker", () => {
    it("should open circuit breaker after threshold failures", async () => {
      // Simular 5 falhas diretamente no circuit breaker
      // O threshold padrão é 5
      for (let i = 0; i < 5; i++) {
        logger.circuitBreaker.recordFailure();
      }

      expect(logger.circuitBreaker.state).toBe("OPEN");
    });

    it("should not send logs when circuit breaker is open", async () => {
      logger.circuitBreaker.state = "OPEN";
      logger.circuitBreaker.nextAttempt = Date.now() + 60000;

      await logger.flushBatch();

      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Retry mechanism", () => {
    it("should retry on failure with exponential backoff", async () => {
      // Mock para simular erro de rede que deve ser retentado
      const networkError = new Error("Network error");
      networkError.code = "ECONNREFUSED";
      networkError.response = null;
      networkError.request = {};

      let callCount = 0;
      axios.post.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(networkError);
        }
        return Promise.resolve({ status: 204 });
      });

      logger.batch = [
        { level: "info", message: "Test", timestamp: new Date().toISOString() },
      ];

      // Chamar sendToLoki diretamente para testar o retry
      await logger.sendToLoki([
        { level: "info", message: "Test", timestamp: new Date().toISOString() },
      ]);

      // Deve ter tentado 3 vezes (2 falhas + 1 sucesso)
      expect(axios.post).toHaveBeenCalledTimes(3);
    }, 20000);
  });

  describe("Flush and close", () => {
    it("should flush pending logs", async () => {
      axios.post.mockResolvedValue({ status: 204 });

      await logger.info("Test message");

      // Limpar o isShuttingDown que pode ter sido setado no afterEach anterior
      logger.isShuttingDown = false;

      await logger.flush();

      expect(axios.post).toHaveBeenCalled();
      expect(logger.batch.length).toBe(0);
    });

    it("should close logger and flush logs", async () => {
      axios.post.mockResolvedValue({ status: 204 });

      // Criar um novo logger para este teste para evitar interferência
      const testLogger = new LokiLogger();
      await testLogger.info("Test message");
      await testLogger.close();

      expect(testLogger.isShuttingDown).toBe(true);
      expect(axios.post).toHaveBeenCalled();
    });
  });

  describe("Singleton pattern", () => {
    it("should return same instance on getLogger", () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });
});
