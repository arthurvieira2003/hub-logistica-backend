// Configuração global para os testes
try {
  require("dotenv").config({ path: ".env.test" });
} catch (error) {
  // Se .env.test não existir, usa .env padrão ou variáveis do sistema
  require("dotenv").config();
}

// Configurar variáveis de ambiente padrão para testes se não estiverem definidas
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-key-for-jest";
}

// Mock do console.log para não poluir a saída dos testes
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Timeout padrão para testes
jest.setTimeout(10000);
