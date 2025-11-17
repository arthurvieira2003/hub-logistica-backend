jest.mock("../../models/user.model", () => {
  return {};
});

jest.mock("../../models/session.model", () => {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  };
});

const sessionService = require("../../services/session.service");
const Session = require("../../models/session.model");
const User = require("../../models/user.model");
const jwt = require("jsonwebtoken");

jest.mock("jsonwebtoken");

require("dotenv").config();

describe("Session Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key";
  });

  describe("generateToken", () => {
    it("deve gerar um token JWT válido", () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        status: "active",
        profile_picture: null,
        isAdmin: false,
      };
      const mockToken = "generated-jwt-token";

      jwt.sign.mockReturnValue(mockToken);

      const result = sessionService.generateToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          status: mockUser.status,
          profile_picture: mockUser.profile_picture,
          isAdmin: mockUser.isAdmin,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      expect(result).toBe(mockToken);
    });
  });

  describe("getUserFromToken", () => {
    it("deve decodificar e retornar dados do usuário do token", () => {
      const token = "valid-jwt-token";
      const mockDecoded = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      jwt.verify.mockReturnValue(mockDecoded);

      const result = sessionService.getUserFromToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(result).toEqual(mockDecoded);
    });
  });

  describe("validateToken", () => {
    it("deve validar um token válido", () => {
      const token = "valid-jwt-token";
      const mockDecoded = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      jwt.verify.mockReturnValue(mockDecoded);

      const result = sessionService.validateToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(result).toEqual(mockDecoded);
    });

    it("deve lançar erro quando token é inválido", () => {
      const token = "invalid-jwt-token";

      jwt.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });

      expect(() => sessionService.validateToken(token)).toThrow(
        "Token inválido ou expirado"
      );
    });
  });

  describe("createSession", () => {
    it("deve criar uma nova sessão", async () => {
      const userId = 1;
      const token = "jwt-token";
      const mockRequest = {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "test-agent",
        },
      };
      const mockSession = {
        id: 1,
        userId,
        token,
        expiresAt: new Date(),
        lastActivity: new Date(),
        ipAddress: mockRequest.ip,
        userAgent: mockRequest.headers["user-agent"],
        isActive: true,
      };

      Session.create.mockResolvedValue(mockSession);

      const result = await sessionService.createSession(
        userId,
        token,
        mockRequest
      );

      expect(Session.create).toHaveBeenCalled();
      const createCall = Session.create.mock.calls[0][0];
      expect(createCall.userId).toBe(userId);
      expect(createCall.token).toBe(token);
      expect(createCall.ipAddress).toBe(mockRequest.ip);
      expect(createCall.userAgent).toBe(mockRequest.headers["user-agent"]);
      expect(createCall.isActive).toBe(true);
      expect(result).toEqual(mockSession);
    });

    it("deve calcular corretamente a data de expiração", async () => {
      const userId = 1;
      const token = "jwt-token";
      const mockRequest = {
        ip: "127.0.0.1",
        headers: { "user-agent": "test-agent" },
      };
      const mockSession = { id: 1 };

      Session.create.mockResolvedValue(mockSession);

      const beforeCreation = new Date();
      await sessionService.createSession(userId, token, mockRequest);
      const afterCreation = new Date();

      const createCall = Session.create.mock.calls[0][0];
      const expiresAt = new Date(createCall.expiresAt);
      const expectedMinExpiry = new Date(
        beforeCreation.getTime() + 24 * 60 * 60 * 1000
      );
      const expectedMaxExpiry = new Date(
        afterCreation.getTime() + 24 * 60 * 60 * 1000
      );

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry.getTime()
      );
      expect(expiresAt.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiry.getTime()
      );
    });
  });

  describe("updateSessionActivity", () => {
    it("deve atualizar a última atividade da sessão", async () => {
      const token = "jwt-token";
      const mockSession = {
        id: 1,
        token,
        lastActivity: new Date("2023-01-01"),
        save: jest.fn().mockResolvedValue(true),
      };

      Session.findOne.mockResolvedValue(mockSession);

      const result = await sessionService.updateSessionActivity(token);

      expect(Session.findOne).toHaveBeenCalledWith({ where: { token } });
      expect(mockSession.lastActivity).toBeInstanceOf(Date);
      expect(mockSession.save).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it("deve retornar null quando sessão não é encontrada", async () => {
      const token = "non-existent-token";

      Session.findOne.mockResolvedValue(null);

      const result = await sessionService.updateSessionActivity(token);

      expect(result).toBeNull();
    });
  });

  describe("deactivateSession", () => {
    it("deve desativar uma sessão", async () => {
      const token = "jwt-token";
      const mockSession = {
        id: 1,
        token,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Session.findOne.mockResolvedValue(mockSession);

      const result = await sessionService.deactivateSession(token);

      expect(Session.findOne).toHaveBeenCalledWith({ where: { token } });
      expect(mockSession.isActive).toBe(false);
      expect(mockSession.save).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it("deve retornar null quando sessão não é encontrada", async () => {
      const token = "non-existent-token";

      Session.findOne.mockResolvedValue(null);

      const result = await sessionService.deactivateSession(token);

      expect(result).toBeNull();
    });
  });

  describe("getActiveSessions", () => {
    it("deve retornar todas as sessões ativas", async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          token: "token1",
          isActive: true,
          expiresAt: new Date(Date.now() + 10000),
          User: {
            id: 1,
            name: "User 1",
            email: "user1@example.com",
          },
        },
        {
          id: 2,
          userId: 2,
          token: "token2",
          isActive: true,
          expiresAt: new Date(Date.now() + 10000),
          User: {
            id: 2,
            name: "User 2",
            email: "user2@example.com",
          },
        },
      ];

      Session.findAll.mockResolvedValue(mockSessions);

      const result = await sessionService.getActiveSessions();

      expect(Session.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockSessions);
    });
  });

  describe("getUserSessions", () => {
    it("deve retornar todas as sessões de um usuário", async () => {
      const userId = 1;
      const mockSessions = [
        {
          id: 1,
          userId,
          token: "token1",
          isActive: true,
          expiresAt: new Date(Date.now() + 10000),
        },
        {
          id: 2,
          userId,
          token: "token2",
          isActive: true,
          expiresAt: new Date(Date.now() + 10000),
        },
      ];

      Session.findAll.mockResolvedValue(mockSessions);

      const result = await sessionService.getUserSessions(userId);

      expect(Session.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockSessions);
    });
  });

  describe("terminateSession", () => {
    it("deve terminar uma sessão ativa", async () => {
      const sessionId = 1;
      const mockSession = {
        id: sessionId,
        userId: 1,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Session.findByPk.mockResolvedValue(mockSession);

      const result = await sessionService.terminateSession(sessionId);

      expect(Session.findByPk).toHaveBeenCalledWith(sessionId);
      expect(mockSession.isActive).toBe(false);
      expect(mockSession.save).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it("deve lançar erro quando sessão não é encontrada", async () => {
      const sessionId = 999;

      Session.findByPk.mockResolvedValue(null);

      await expect(sessionService.terminateSession(sessionId)).rejects.toThrow(
        "Sessão não encontrada"
      );
    });

    it("deve lançar erro quando sessão já está inativa", async () => {
      const sessionId = 1;
      const mockSession = {
        id: sessionId,
        userId: 1,
        isActive: false,
      };

      Session.findByPk.mockResolvedValue(mockSession);

      await expect(sessionService.terminateSession(sessionId)).rejects.toThrow(
        "Sessão já está inativa"
      );
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("deve marcar sessões expiradas como inativas", async () => {
      Session.update.mockResolvedValue([5]);

      await sessionService.cleanupExpiredSessions();

      expect(Session.update).toHaveBeenCalledWith(
        { isActive: false },
        {
          where: {
            expiresAt: expect.any(Object),
            isActive: true,
          },
        }
      );
    });
  });
});
