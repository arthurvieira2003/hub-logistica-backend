try {
  require("dotenv").config({ path: ".env.test" });
} catch (error) {
  require("dotenv").config();
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-key-for-jest";
}

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.setTimeout(10000);
