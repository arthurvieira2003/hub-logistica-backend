const {
  sanitizeSensitiveData,
  getNanoTimestamp,
  extractErrorInfo,
  generateLabels,
  formatLogForLoki,
} = require("../../utils/logger.utils");

describe("Logger Utils", () => {
  describe("sanitizeSensitiveData", () => {
    it("should sanitize password fields", () => {
      const data = {
        username: "test",
        password: "secret123",
      };
      const sanitized = sanitizeSensitiveData(data);
      expect(sanitized.password).toBe("***");
      expect(sanitized.username).toBe("test");
    });

    it("should sanitize token fields", () => {
      const data = {
        token: "abc123",
        accessToken: "xyz789",
      };
      const sanitized = sanitizeSensitiveData(data);
      expect(sanitized.token).toBe("***");
      expect(sanitized.accessToken).toBe("***");
    });

    it("should sanitize nested objects", () => {
      const data = {
        user: {
          name: "John",
          password: "secret",
        },
      };
      const sanitized = sanitizeSensitiveData(data);
      expect(sanitized.user.password).toBe("***");
      expect(sanitized.user.name).toBe("John");
    });

    it("should sanitize arrays", () => {
      const data = [
        { username: "user1", password: "pass1" },
        { username: "user2", password: "pass2" },
      ];
      const sanitized = sanitizeSensitiveData(data);
      expect(sanitized[0].password).toBe("***");
      expect(sanitized[1].password).toBe("***");
    });

    it("should handle null and undefined", () => {
      expect(sanitizeSensitiveData(null)).toBe(null);
      expect(sanitizeSensitiveData(undefined)).toBe(undefined);
    });

    it("should handle strings", () => {
      expect(sanitizeSensitiveData("test string")).toBe("test string");
    });
  });

  describe("getNanoTimestamp", () => {
    it("should return timestamp in nanoseconds", () => {
      const timestamp = getNanoTimestamp();
      expect(typeof timestamp).toBe("string");
      expect(timestamp.length).toBeGreaterThan(13);
    });
  });

  describe("extractErrorInfo", () => {
    it("should extract error information", () => {
      const error = new Error("Test error");
      error.stack = "Error stack";
      const info = extractErrorInfo(error);
      expect(info.message).toBe("Test error");
      expect(info.stack).toBe("Error stack");
      expect(info.type).toBe("Error");
    });

    it("should handle errors with code", () => {
      const error = new Error("Test error");
      error.code = "ERR_TEST";
      const info = extractErrorInfo(error);
      expect(info.code).toBe("ERR_TEST");
    });

    it("should handle non-Error objects", () => {
      const info = extractErrorInfo("String error");
      expect(info.message).toBe("String error");
    });

    it("should handle null", () => {
      expect(extractErrorInfo(null)).toBe(null);
    });
  });

  describe("generateLabels", () => {
    it("should generate labels with default values", () => {
      const labels = generateLabels();
      expect(labels.app).toBeDefined();
      expect(labels.env).toBeDefined();
      expect(labels.version).toBeDefined();
      expect(labels.hostname).toBeDefined();
      expect(labels.service).toBeDefined();
    });

    it("should merge additional labels", () => {
      const labels = generateLabels({ custom: "value" });
      expect(labels.custom).toBe("value");
    });
  });

  describe("formatLogForLoki", () => {
    it("should format log entry for Loki", () => {
      const logEntry = {
        level: "info",
        message: "Test message",
        timestamp: "2025-01-01T00:00:00Z",
        customField: "value",
      };
      const formatted = formatLogForLoki(logEntry);
      expect(formatted.stream).toBeDefined();
      expect(formatted.values).toBeDefined();
      expect(formatted.values.length).toBe(1);
      expect(formatted.values[0].length).toBe(2);
    });

    it("should sanitize sensitive data in formatted log", () => {
      const logEntry = {
        level: "info",
        message: "Test",
        password: "secret",
      };
      const formatted = formatLogForLoki(logEntry);
      const logLine = JSON.parse(formatted.values[0][1]);
      expect(logLine.password).toBe("***");
    });
  });
});
