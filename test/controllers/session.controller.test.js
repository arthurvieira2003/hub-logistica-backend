const sessionController = require('../../controllers/session.controller');
const sessionService = require('../../services/session.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockFactory');

// Mock do serviço
jest.mock('../../services/session.service');

describe('Session Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('deve validar um token válido e retornar dados do usuário', async () => {
      const mockToken = 'valid-jwt-token';
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      };

      req.headers.authorization = mockToken;

      sessionService.validateToken.mockResolvedValue(mockUser);
      sessionService.updateSessionActivity.mockResolvedValue({});

      await sessionController.validateToken(req, res);

      expect(sessionService.validateToken).toHaveBeenCalledWith(mockToken);
      expect(sessionService.updateSessionActivity).toHaveBeenCalledWith(mockToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 401 quando token é inválido', async () => {
      const mockToken = 'invalid-jwt-token';
      const errorMessage = 'Token inválido ou expirado';

      req.headers.authorization = mockToken;

      sessionService.validateToken.mockRejectedValue(new Error(errorMessage));

      await sessionController.validateToken(req, res);

      expect(sessionService.validateToken).toHaveBeenCalledWith(mockToken);
      expect(sessionService.updateSessionActivity).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });

  describe('getActiveSessions', () => {
    it('deve retornar todas as sessões ativas', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          token: 'token1',
          isActive: true,
          User: {
            id: 1,
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
        {
          id: 2,
          userId: 2,
          token: 'token2',
          isActive: true,
          User: {
            id: 2,
            name: 'User 2',
            email: 'user2@example.com',
          },
        },
      ];

      sessionService.cleanupExpiredSessions.mockResolvedValue();
      sessionService.getActiveSessions.mockResolvedValue(mockSessions);

      await sessionController.getActiveSessions(req, res);

      expect(sessionService.cleanupExpiredSessions).toHaveBeenCalled();
      expect(sessionService.getActiveSessions).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSessions);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      const errorMessage = 'Erro ao buscar sessões';

      sessionService.cleanupExpiredSessions.mockResolvedValue();
      sessionService.getActiveSessions.mockRejectedValue(new Error(errorMessage));

      await sessionController.getActiveSessions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });

  describe('getUserSessions', () => {
    it('deve retornar todas as sessões de um usuário', async () => {
      const userId = '1';
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          token: 'token1',
          isActive: true,
        },
        {
          id: 2,
          userId: 1,
          token: 'token2',
          isActive: true,
        },
      ];

      req.params = { userId };

      sessionService.getUserSessions.mockResolvedValue(mockSessions);

      await sessionController.getUserSessions(req, res);

      expect(sessionService.getUserSessions).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSessions);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      const userId = '1';
      const errorMessage = 'Erro ao buscar sessões do usuário';

      req.params = { userId };

      sessionService.getUserSessions.mockRejectedValue(new Error(errorMessage));

      await sessionController.getUserSessions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });

  describe('logoutSession', () => {
    it('deve desativar uma sessão com sucesso', async () => {
      const mockToken = 'jwt-token';

      req.headers.authorization = mockToken;

      sessionService.deactivateSession.mockResolvedValue({});

      await sessionController.logoutSession(req, res);

      expect(sessionService.deactivateSession).toHaveBeenCalledWith(mockToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sessão encerrada com sucesso',
      });
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      const mockToken = 'jwt-token';
      const errorMessage = 'Erro ao desativar sessão';

      req.headers.authorization = mockToken;

      sessionService.deactivateSession.mockRejectedValue(new Error(errorMessage));

      await sessionController.logoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });

  describe('terminateSession', () => {
    it('deve terminar uma sessão com sucesso', async () => {
      const sessionId = '1';
      const mockSession = {
        id: 1,
        userId: 1,
        isActive: false,
      };

      req.params = { id: sessionId };

      sessionService.terminateSession.mockResolvedValue(mockSession);

      await sessionController.terminateSession(req, res);

      expect(sessionService.terminateSession).toHaveBeenCalledWith(sessionId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sessão terminada com sucesso',
        session: {
          id: mockSession.id,
          userId: mockSession.userId,
          terminatedAt: expect.any(Date),
        },
      });
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      const sessionId = '1';
      const errorMessage = 'Sessão não encontrada';

      req.params = { id: sessionId };

      sessionService.terminateSession.mockRejectedValue(new Error(errorMessage));

      await sessionController.terminateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });
});

