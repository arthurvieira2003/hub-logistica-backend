const sessionMiddleware = require("../../middleware/session.middleware");
const sessionService = require("../../services/session.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

// Mock do serviço
jest.mock("../../services/session.service");

describe("Session Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("ensureSessionLoaded", () => {
    it("deve validar token e adicionar dados do usuário ao request", async () => {
      const mockToken = "valid-jwt-token";
      const mockUserData = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      req.headers.authorization = `Bearer ${mockToken}`;
      sessionService.validateToken.mockReturnValue(mockUserData);
      sessionService.updateSessionActivity.mockResolvedValue({});

      await sessionMiddleware.ensureSessionLoaded(req, res, next);

      expect(sessionService.validateToken).toHaveBeenCalledWith(mockToken);
      expect(sessionService.updateSessionActivity).toHaveBeenCalledWith(
        mockToken
      );
      expect(req.user).toEqual(mockUserData);
      expect(next).toHaveBeenCalled();
    });

    it("deve extrair token sem prefixo Bearer", async () => {
      const mockToken = "valid-jwt-token";
      const mockUserData = { id: 1, email: "test@example.com" };

      req.headers.authorization = mockToken;
      sessionService.validateToken.mockReturnValue(mockUserData);
      sessionService.updateSessionActivity.mockResolvedValue({});

      await sessionMiddleware.ensureSessionLoaded(req, res, next);

      expect(sessionService.validateToken).toHaveBeenCalledWith(mockToken);
      expect(next).toHaveBeenCalled();
    });

    it("deve retornar erro 401 quando token não é fornecido", async () => {
      req.headers.authorization = undefined;

      await sessionMiddleware.ensureSessionLoaded(req, res, next);

      expect(sessionService.validateToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Token de autenticação não fornecido",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar erro 401 quando token está vazio", async () => {
      req.headers.authorization = "Bearer ";

      await sessionMiddleware.ensureSessionLoaded(req, res, next);

      expect(sessionService.validateToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Token de autenticação não fornecido",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar erro 401 quando token é inválido", async () => {
      const mockToken = "invalid-token";

      req.headers.authorization = `Bearer ${mockToken}`;
      sessionService.validateToken.mockImplementation(() => {
        throw new Error("Token inválido");
      });

      await sessionMiddleware.ensureSessionLoaded(req, res, next);

      expect(sessionService.validateToken).toHaveBeenCalledWith(mockToken);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Sessão inválida ou expirada",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("deve lidar com erro ao atualizar atividade da sessão", async () => {
      const mockToken = "valid-jwt-token";
      const mockUserData = { id: 1, email: "test@example.com" };

      req.headers.authorization = `Bearer ${mockToken}`;
      sessionService.validateToken.mockReturnValue(mockUserData);
      sessionService.updateSessionActivity.mockRejectedValue(
        new Error("Erro ao atualizar")
      );

      await sessionMiddleware.ensureSessionLoaded(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Sessão inválida ou expirada",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("waitForSession", () => {
    it("deve passar quando dados do usuário estão presentes", () => {
      req.user = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      };

      sessionMiddleware.waitForSession(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("deve retornar erro 401 quando req.user não existe", () => {
      req.user = undefined;

      sessionMiddleware.waitForSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Dados da sessão não carregados completamente",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar erro 401 quando req.user.id não existe", () => {
      req.user = {
        name: "Test User",
        email: "test@example.com",
      };

      sessionMiddleware.waitForSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Dados da sessão não carregados completamente",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar erro 401 quando req.user.id é null", () => {
      req.user = {
        id: null,
        name: "Test User",
      };

      sessionMiddleware.waitForSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
