const { getLogger } = require("../services/logger.service");
const config = require("../config/logger.config");
const axios = require("axios");

/**
 * Testa a conectividade com o Loki
 */
async function testLokiConnection() {
  // Executar diagnóstico de forma não-bloqueante
  // Qualquer erro aqui não deve afetar o funcionamento do backend
  try {
    const logger = getLogger();
    const lokiUrl = config.loki.url;
    const readyUrl = `http://${config.loki.host}:${config.loki.port}/ready`;
    const pushUrl = lokiUrl;

    console.log("\n" + "=".repeat(60));
    console.log("🔍 DIAGNÓSTICO DE CONECTIVIDADE COM LOKI");
    console.log("=".repeat(60));

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

    // Teste 1: Resolução DNS
    console.log("\n[1/3] Testando resolução DNS...");
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
      console.log(`   ✓ DNS resolvido: ${config.loki.host} (${latency}ms)`);
    } catch (error) {
      diagnostics.tests.dnsResolution = {
        status: "error",
        message: `Erro ao resolver DNS: ${error.message}`,
        latency: null,
      };
      console.log(`   ✗ Erro ao resolver DNS: ${error.message}`);
    }

    // Teste 2: Endpoint /ready
    console.log("\n[2/3] Testando endpoint /ready...");
    try {
      const startTime = Date.now();
      const response = await axios.get(readyUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500, // Aceitar qualquer status < 500
      });
      const latency = Date.now() - startTime;

      if (response.status === 200) {
        diagnostics.tests.readyEndpoint = {
          status: "success",
          message: `Loki está pronto (Status: ${response.status})`,
          latency: `${latency}ms`,
        };
        diagnostics.summary.passedTests++;
        console.log(
          `   ✓ Loki está pronto (Status: ${response.status}, ${latency}ms)`
        );
      } else if (response.status === 503) {
        diagnostics.tests.readyEndpoint = {
          status: "warning",
          message: `Loki ainda não está pronto (Status: 503) - isso é normal se acabou de iniciar`,
          latency: `${latency}ms`,
        };
        console.log(
          `   ⚠ Loki ainda não está pronto (Status: 503, ${latency}ms)`
        );
        console.log(`   ⚠ Aguarde alguns segundos e tente novamente`);
      } else {
        diagnostics.tests.readyEndpoint = {
          status: "warning",
          message: `Resposta inesperada (Status: ${response.status})`,
          latency: `${latency}ms`,
        };
        console.log(
          `   ⚠ Resposta inesperada: Status ${response.status} (${latency}ms)`
        );
      }
    } catch (error) {
      const latency = error.response ? "N/A" : "timeout";
      diagnostics.tests.readyEndpoint = {
        status: "error",
        message: `Erro ao conectar: ${error.message}`,
        latency: latency,
      };
      console.log(`   ✗ Erro ao conectar: ${error.message}`);
      if (error.code === "ECONNREFUSED") {
        console.log(
          `   ✗ Conexão recusada - verifique se o nginx-loki está rodando`
        );
        console.log(
          `   ✗ Verifique na VPS: docker service ps loki-logging_nginx-loki`
        );
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.log(
          `   ✗ Timeout - verifique conectividade de rede e firewall`
        );
        console.log(
          `   ✗ Teste manualmente: curl -v http://${config.loki.host}:${config.loki.port}/ready`
        );
        console.log(
          `   ✗ Verifique se a porta ${config.loki.port} está aberta no firewall`
        );
        console.log(
          `   ✗ Verifique se o serviço está rodando: docker stack services loki-logging`
        );
      } else if (error.code === "ENOTFOUND") {
        console.log(`   ✗ Host não encontrado - verifique o DNS`);
      } else if (error.code) {
        console.log(`   ✗ Código de erro: ${error.code}`);
      }
    }

    // Teste 3: Endpoint de push (teste real de envio de log)
    console.log("\n[3/3] Testando endpoint de push (envio de log de teste)...");
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
        console.log(
          `   ✓ Log enviado com sucesso (Status: ${response.status}, ${latency}ms)`
        );
      } else if (response.status === 503) {
        diagnostics.tests.pushEndpoint = {
          status: "warning",
          message: `Loki retornou 503 (não está pronto ainda) - mas pode aceitar logs`,
          latency: `${latency}ms`,
        };
        console.log(
          `   ⚠ Loki retornou 503 (não está pronto ainda, ${latency}ms)`
        );
        console.log(`   ⚠ O backend continuará tentando enviar logs`);
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
      console.log(`   ✗ Erro ao enviar log: ${errorMessage}`);
      if (error.code === "ECONNREFUSED") {
        console.log(
          `   ✗ Conexão recusada - verifique se o nginx-loki está rodando`
        );
        console.log(
          `   ✗ Verifique na VPS: docker service ps loki-logging_nginx-loki`
        );
      } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.log(`   ✗ Timeout - verifique conectividade de rede`);
        console.log(
          `   ✗ Teste manualmente: curl -X POST http://${config.loki.host}:${config.loki.port}${config.loki.endpoint} -H "Content-Type: application/json" -d '{"streams":[]}'`
        );
        console.log(
          `   ✗ Verifique se a porta ${config.loki.port} está aberta no firewall`
        );
        console.log(
          `   ✗ O backend continuará tentando enviar logs em background`
        );
      } else if (error.response) {
        console.log(
          `   ✗ Resposta HTTP: ${error.response.status} - ${error.response.statusText}`
        );
      }
    }

    // Resumo
    diagnostics.summary.success =
      diagnostics.summary.passedTests === diagnostics.summary.totalTests;
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO DOS TESTES");
    console.log("=".repeat(60));
    console.log(`Total de testes: ${diagnostics.summary.totalTests}`);
    console.log(`Testes aprovados: ${diagnostics.summary.passedTests}`);
    console.log(
      `Status geral: ${diagnostics.summary.success ? "✓ SUCESSO" : "⚠ ATENÇÃO"}`
    );

    // Se houver falhas, mostrar recomendações
    if (!diagnostics.summary.success) {
      console.log("\n💡 RECOMENDAÇÕES:");
      console.log(
        "   1. Verifique se o serviço nginx-loki está rodando na VPS:"
      );
      console.log(`      docker stack services loki-logging`);
      console.log("   2. Verifique os logs do nginx-loki:");
      console.log(`      docker service logs loki-logging_nginx-loki`);
      console.log("   3. Teste conectividade na VPS (deve funcionar):");
      console.log(`      curl -v http://localhost:${config.loki.port}/ready`);
      console.log(
        "   4. Teste conectividade externa (pode falhar se firewall bloquear):"
      );
      console.log(
        `      curl -v http://${config.loki.host}:${config.loki.port}/ready`
      );
      console.log(
        "   5. ⚠ IMPORTANTE: Verifique o FIREWALL DO PROVEDOR DE CLOUD:"
      );
      console.log(
        `      - AWS: Security Groups (adicione regra para porta ${config.loki.port})`
      );
      console.log(
        `      - DigitalOcean: Firewall (adicione regra para porta ${config.loki.port})`
      );
      console.log(
        `      - Azure: Network Security Groups (adicione regra para porta ${config.loki.port})`
      );
      console.log(
        `      - Google Cloud: Firewall Rules (adicione regra para porta ${config.loki.port})`
      );
      console.log(
        `      - Outros: Verifique o painel de firewall do seu provedor`
      );
      console.log("   6. Verifique firewall local (ufw/iptables):");
      console.log(`      sudo ufw status | grep ${config.loki.port}`);
      console.log(`      sudo iptables -L -n | grep ${config.loki.port}`);
      console.log(
        "   7. Verifique se o Docker está expondo a porta corretamente:"
      );
      console.log(
        `      netstat -tlnp | grep ${config.loki.port}  # ou ss -tlnp | grep ${config.loki.port}`
      );
      console.log(
        "   8. O backend continuará tentando enviar logs em background"
      );
    }

    console.log("=".repeat(60) + "\n");

    // Logar diagnóstico completo (tentar, mas não falhar se não conseguir)
    try {
      logger.info("Loki connectivity diagnostics completed", diagnostics);
    } catch (error) {
      // Ignorar erro ao logar - não deve afetar o backend
      console.error(
        "[Diagnóstico Loki] Erro ao logar resultado:",
        error.message
      );
    }

    return diagnostics;
  } catch (error) {
    // Capturar qualquer erro não tratado e não propagar
    console.error("[Diagnóstico Loki] Erro crítico (ignorado):", error.message);
    return null;
  }
}

/**
 * Registra informações de startup da aplicação
 */
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

/**
 * Configura graceful shutdown
 */
function setupGracefulShutdown(server) {
  const logger = getLogger();

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`, {
      signal,
      pid: process.pid,
    });

    // Parar de aceitar novas conexões
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Fazer flush dos logs pendentes
    try {
      await logger.flush();
      logger.info("Logs flushed successfully");
    } catch (error) {
      console.error("Error flushing logs:", error);
    }

    // Encerrar processo
    process.exit(0);
  };

  // Capturar sinais de encerramento
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Capturar erros fatais
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
