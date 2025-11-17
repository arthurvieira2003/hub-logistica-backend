const express = require("express");
const request = require("supertest");
const {
  requestIdMiddleware,
  httpLoggerMiddleware,
} = require("../../middleware/logger.middleware");
const { getLogger } = require("../../services/logger.service");

jest.mock("../../services/logger.service");

describe("Logger Middleware", () => {
  let app;
  let mockLogger;

  beforeEach(() => {
    app = express();
    mockLogger = {
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };
    getLogger.mockReturnValue(mockLogger);
  });

  describe("requestIdMiddleware", () => {
    it("should add request ID to request object", (done) => {
      app.use(requestIdMiddleware);
      app.get("/test", (req, res) => {
        expect(req.id).toBeDefined();
        expect(typeof req.id).toBe("string");
        res.status(200).json({ requestId: req.id });
      });

      request(app)
        .get("/test")
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.requestId).toBeDefined();
          expect(res.headers["x-request-id"]).toBeDefined();
          done();
        });
    });

    it("should use existing x-request-id header if present", (done) => {
      app.use(requestIdMiddleware);
      app.get("/test", (req, res) => {
        expect(req.id).toBe("custom-request-id");
        res.status(200).json({});
      });

      request(app)
        .get("/test")
        .set("x-request-id", "custom-request-id")
        .expect(200, done);
    });
  });

  describe("httpLoggerMiddleware", () => {
    beforeEach(() => {
      app.use(requestIdMiddleware);
      // httpLoggerMiddleware será adicionado em cada teste para permitir ordem customizada
    });

    it("should log incoming request", (done) => {
      app.use(httpLoggerMiddleware);
      app.get("/test", (req, res) => {
        res.status(200).json({});
      });

      request(app)
        .get("/test")
        .expect(200)
        .end(() => {
          expect(mockLogger.info).toHaveBeenCalledWith(
            "HTTP Request received",
            expect.objectContaining({
              method: "GET",
              url: "/test",
            })
          );
          done();
        });
    });

    it("should log request completion with status code", (done) => {
      app.use(httpLoggerMiddleware);
      app.get("/test", (req, res) => {
        res.status(200).json({});
      });

      request(app)
        .get("/test")
        .expect(200)
        .end(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            "info",
            "HTTP Request completed",
            expect.objectContaining({
              statusCode: 200,
              duration: expect.any(Number),
            })
          );
          done();
        });
    });

    it("should log error level for 5xx status codes", (done) => {
      app.use(httpLoggerMiddleware);
      app.get("/error", (req, res) => {
        res.status(500).json({ error: "Internal error" });
      });

      request(app)
        .get("/error")
        .expect(500)
        .end(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            "error",
            "HTTP Request completed",
            expect.objectContaining({
              statusCode: 500,
            })
          );
          done();
        });
    });

    it("should log warn level for 4xx status codes", (done) => {
      app.use(httpLoggerMiddleware);
      app.get("/notfound", (req, res) => {
        res.status(404).json({ error: "Not found" });
      });

      request(app)
        .get("/notfound")
        .expect(404)
        .end(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            "warn",
            "HTTP Request completed",
            expect.objectContaining({
              statusCode: 404,
            })
          );
          done();
        });
    });

    it("should capture request body for small payloads", (done) => {
      // express.json() precisa estar ANTES do httpLoggerMiddleware para que req.body esteja disponível
      app.use(express.json());
      app.use(httpLoggerMiddleware);
      app.post("/test", (req, res) => {
        res.status(200).json({});
      });

      request(app)
        .post("/test")
        .send({ key: "value" })
        .expect(200)
        .end((err) => {
          if (err) return done(err);
          // O requestBody é adicionado ao requestInfo antes do log de completion
          // então deve estar no responseInfo
          const logCalls = mockLogger.log.mock.calls;
          const completionCall = logCalls.find(
            (call) => call[1] === "HTTP Request completed"
          );
          expect(completionCall).toBeDefined();
          expect(completionCall[2]).toHaveProperty("requestBody", {
            key: "value",
          });
          done();
        });
    });

    it("should capture user ID if available", (done) => {
      // Middleware para definir req.user ANTES do logger
      app.use((req, res, next) => {
        req.user = { id: "user-123" };
        next();
      });
      app.use(httpLoggerMiddleware);

      app.get("/test", (req, res) => {
        res.status(200).json({});
      });

      request(app)
        .get("/test")
        .expect(200)
        .end((err) => {
          if (err) return done(err);
          // userId é adicionado antes do primeiro log, então pode ser verificado no primeiro ou segundo
          expect(mockLogger.info).toHaveBeenCalledWith(
            "HTTP Request received",
            expect.objectContaining({
              userId: "user-123",
            })
          );
          done();
        });
    });
  });
});
