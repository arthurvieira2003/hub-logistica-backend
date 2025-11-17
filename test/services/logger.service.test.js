const { LokiLogger, getLogger } = require("../../services/logger.service");
const axios = require("axios");

jest.mock("axios");

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
      axios.post.mockRejectedValue(new Error("Network error"));

      for (let i = 0; i < 6; i++) {
        logger.batch = [
          {
            level: "info",
            message: "Test",
            timestamp: new Date().toISOString(),
          },
        ];
        try {
          await logger.flushBatch();
        } catch (e) {}
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
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should retry on failure with exponential backoff", async () => {
      // Mock para simular erro de rede que deve ser retentado
      const networkError = new Error("Network error");
      networkError.code = "ECONNREFUSED";
      networkError.response = null;
      networkError.request = {};

      axios.post
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ status: 204 });

      logger.batch = [
        { level: "info", message: "Test", timestamp: new Date().toISOString() },
      ];

      const flushPromise = logger.flushBatch();
      
      // Avançar os timers para os delays de retry (1000ms, 2000ms)
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Permitir que a primeira tentativa falhe
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // Permitir que a segunda tentativa falhe
      jest.advanceTimersByTime(4000);
      
      await flushPromise;

      expect(axios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe("Flush and close", () => {
    it("should flush pending logs", async () => {
      axios.post.mockResolvedValue({ status: 204 });

      await logger.info("Test message");
      await logger.flush();

      expect(axios.post).toHaveBeenCalled();
      expect(logger.batch.length).toBe(0);
    });

    it("should close logger and flush logs", async () => {
      axios.post.mockResolvedValue({ status: 204 });

      await logger.info("Test message");
      await logger.close();

      expect(logger.isShuttingDown).toBe(true);
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
