const { getLogger } = require("../services/logger.service");
const config = require("../config/logger.config");
const axios = require("axios");

async function testLokiConnection() {
  try {
    const logger = getLogger();
    const lokiUrl = config.loki.url;
    const readyUrl = `http://${config.loki.host}:${config.loki.port}/ready`;
    const pushUrl = lokiUrl;

    const diagnostics = {
      lokiUrl: lokiUrl,
      host: config.loki.host,
      port: config.loki.port,
      endpoint: config.loki.endpoint,
      tests: {
        dnsResolution: { status: "pending", message: "", latency: null },
        readyEndpoint: { status: "pending", message: "", latency: null },
        pushEndpoint: { status: "pending", message: "", latency: null },
      },
      summary: { success: false, totalTests: 3, passedTests: 0 },
    };

    try {
      const startTime = Date.now();
      const dns = require("dns").promises;
      await dns.lookup(config.loki.host);
      const latency = Date.now() - startTime;
      diagnostics.tests.dnsResolution = {
        status: "success",
        message: `DNS resolvido com sucesso`,
        latency: `${latency}ms`,
      };
      diagnostics.summary.passedTests++;
    } catch (error) {
      diagnostics.tests.dnsResolution = {
        status: "error",
        message: `Erro ao resolver DNS: ${error.message}`,
        latency: null,
      };
    }

    try {
      const startTime = Date.now();
      const response = await axios.get(readyUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });
      const latency = Date.now() - startTime;

      if (response.status === 200) {
        diagnostics.tests.readyEndpoint = {
          status: "success",
          message: `Loki está pronto (Status: ${response.status})`,
          latency: `${latency}ms`,
        };
        diagnostics.summary.passedTests++;
      } else if (response.status === 503) {
        diagnostics.tests.readyEndpoint = {
          status: "warning",
          message: `Loki ainda não está pronto (Status: 503) - isso é normal se acabou de iniciar`,
          latency: `${latency}ms`,
        };
      } else {
        diagnostics.tests.readyEndpoint = {
          status: "warning",
          message: `Resposta inesperada (Status: ${response.status})`,
          latency: `${latency}ms`,
        };
      }
    } catch (error) {
      const latency = error.response ? "N/A" : "timeout";
      diagnostics.tests.readyEndpoint = {
        status: "error",
        message: `Erro ao conectar: ${error.message}`,
        latency: latency,
      };
    }

    try {
      const testPayload = {
        streams: [
          {
            stream: {
              test: "connection",
              app: config.app.name,
              hostname: config.app.hostname,
            },
            values: [
              [`${Date.now()}000000`, "Teste de conectividade do backend"],
            ],
          },
        ],
      };

      const startTime = Date.now();
      const response = await axios.post(pushUrl, testPayload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
        validateStatus: (status) =>
          status === 200 || status === 204 || status === 503,
      });
      const latency = Date.now() - startTime;

      if (response.status === 204 || response.status === 200) {
        diagnostics.tests.pushEndpoint = {
          status: "success",
          message: `Log enviado com sucesso (Status: ${response.status})`,
          latency: `${latency}ms`,
        };
        diagnostics.summary.passedTests++;
      } else if (response.status === 503) {
        diagnostics.tests.pushEndpoint = {
          status: "warning",
          message: `Loki retornou 503 (não está pronto ainda) - mas pode aceitar logs`,
          latency: `${latency}ms`,
        };
      }
    } catch (error) {
      const latency = error.response ? "N/A" : "timeout";
      let errorMessage = error.message;
      if (error.code) {
        errorMessage = `${error.code}: ${error.message}`;
      }

      diagnostics.tests.pushEndpoint = {
        status: "error",
        message: `Erro ao enviar log: ${errorMessage}`,
        latency: latency,
      };
    }

    diagnostics.summary.success =
      diagnostics.summary.passedTests === diagnostics.summary.totalTests;

    try {
      logger.info("Loki connectivity diagnostics completed", diagnostics);
    } catch (error) {
      console.error(
        "[Diagnóstico Loki] Erro ao logar resultado:",
        error.message
      );
    }

    return diagnostics;
  } catch (error) {
    console.error("[Diagnóstico Loki] Erro crítico (ignorado):", error.message);
    return null;
  }
}

function logStartup(port) {
  const logger = getLogger();

  logger.info("Application starting", {
    app: config.app.name,
    version: config.app.version,
    env: config.app.env,
    hostname: config.app.hostname,
    service: config.app.service,
    port: port,
    nodeVersion: process.version,
    pid: process.pid,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    loki: {
      url: config.loki.url,
      enabled: true,
    },
  });
}

function setupGracefulShutdown(server) {
  const logger = getLogger();

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`, {
      signal,
      pid: process.pid,
    });

    server.close(() => {
      logger.info("HTTP server closed");
    });

    try {
      await logger.flush();
      logger.info("Logs flushed successfully");
    } catch (error) {
      console.error("Error flushing logs:", error);
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", async (error) => {
    logger.error("Fatal error during shutdown", {
      error: error.message,
      stack: error.stack,
    });

    try {
      await logger.flush();
    } catch (flushError) {
      console.error("Error flushing logs during fatal error:", flushError);
    }

    process.exit(1);
  });
}

module.exports = {
  logStartup,
  setupGracefulShutdown,
  testLokiConnection,
};
