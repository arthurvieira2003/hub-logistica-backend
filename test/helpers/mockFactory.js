const createMockUser = (overrides = {}) => ({
  id: 1,
  name: "Test User",
  email: "test@example.com",
  password: "$2a$10$encryptedPasswordHash",
  status: "active",
  profile_picture: null,
  isAdmin: false,
  ...overrides,
});

const createMockSession = (overrides = {}) => ({
  id: 1,
  userId: 1,
  token: "mock-jwt-token",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  lastActivity: new Date(),
  ipAddress: "127.0.0.1",
  userAgent: "test-agent",
  isActive: true,
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  headers: {},
  ip: "127.0.0.1",
  ...overrides,
});

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

module.exports = {
  createMockUser,
  createMockSession,
  createMockRequest,
  createMockResponse,
};
