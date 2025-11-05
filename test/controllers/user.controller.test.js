// Mock do database.config antes de importar qualquer coisa
jest.mock('../../config/database.config', () => {
  return {};
});

// Mock dos modelos antes de importar os controllers
jest.mock('../../models/user.model', () => {
  return {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };
});

jest.mock('../../models/session.model', () => {
  return {};
});

const userController = require('../../controllers/user.controller');
const userService = require('../../services/user.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockFactory');

// Mock do serviço
jest.mock('../../services/user.service');

describe('User Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('deve criar um usuário com sucesso', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.createUser.mockResolvedValue(mockUser);

      await userController.createUser(req, res);

      expect(userService.createUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const errorMessage = 'Erro ao criar usuário';
      userService.createUser.mockRejectedValue(new Error(errorMessage));

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('updatePassword', () => {
    it('deve atualizar a senha com sucesso', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'newPassword',
      };

      req.body = {
        id: 1,
        password: 'newPassword',
      };

      userService.updatePassword.mockResolvedValue(mockUser);

      await userController.updatePassword(req, res);

      // O controller passa id, mas o serviço espera email
      // Isso reflete o comportamento atual do código
      expect(userService.updatePassword).toHaveBeenCalledWith(1, 'newPassword');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.body = {
        id: 1,
        password: 'newPassword',
      };

      const errorMessage = 'Erro ao atualizar senha';
      userService.updatePassword.mockRejectedValue(new Error(errorMessage));

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('changeStatus', () => {
    it('deve alterar o status com sucesso', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        status: 'inactive',
      };

      req.body = {
        id: 1,
        status: 'inactive',
      };

      userService.changeStatus.mockResolvedValue(mockUser);

      await userController.changeStatus(req, res);

      // O controller passa id, mas o serviço espera email
      // Isso reflete o comportamento atual do código
      expect(userService.changeStatus).toHaveBeenCalledWith(1, 'inactive');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.body = {
        id: 1,
        status: 'inactive',
      };

      const errorMessage = 'Erro ao alterar status';
      userService.changeStatus.mockRejectedValue(new Error(errorMessage));

      await userController.changeStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('getUser', () => {
    it('deve retornar um usuário pelo ID', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      };

      req.params = { id: '1' };

      userService.getUser.mockResolvedValue(mockUser);

      await userController.getUser(req, res);

      expect(userService.getUser).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.params = { id: '1' };

      const errorMessage = 'Erro ao buscar usuário';
      userService.getUser.mockRejectedValue(new Error(errorMessage));

      await userController.getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('getAllUsers', () => {
    it('deve retornar todos os usuários', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', email: 'user1@example.com' },
        { id: 2, name: 'User 2', email: 'user2@example.com' },
      ];

      userService.getAllUsers.mockResolvedValue(mockUsers);

      await userController.getAllUsers(req, res);

      expect(userService.getAllUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      const errorMessage = 'Erro ao buscar usuários';
      userService.getAllUsers.mockRejectedValue(new Error(errorMessage));

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('authenticateUser', () => {
    it('deve autenticar usuário e retornar token', async () => {
      const mockToken = 'jwt-token';

      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.authenticateUser.mockResolvedValue(mockToken);

      await userController.authenticateUser(req, res);

      expect(userService.authenticateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        req
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ token: mockToken });
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      const errorMessage = 'Senha inválida';
      userService.authenticateUser.mockRejectedValue(new Error(errorMessage));

      await userController.authenticateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('updateUserPicture', () => {
    it('deve atualizar a foto de perfil com sucesso', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        profile_picture: 'base64image',
      };

      req.body = {
        email: 'test@example.com',
        image: 'base64image',
      };

      userService.updateUserPicture.mockResolvedValue(mockUser);

      await userController.updateUserPicture(req, res);

      expect(userService.updateUserPicture).toHaveBeenCalledWith(
        'test@example.com',
        'base64image'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.body = {
        email: 'test@example.com',
        image: 'base64image',
      };

      const errorMessage = 'Erro ao atualizar foto';
      userService.updateUserPicture.mockRejectedValue(new Error(errorMessage));

      await userController.updateUserPicture(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('getUserPicture', () => {
    it('deve retornar a foto de perfil do usuário', async () => {
      const mockImage = 'base64image';

      req.params = { email: 'test@example.com' };

      userService.getUserPicture.mockResolvedValue(mockImage);

      await userController.getUserPicture(req, res);

      expect(userService.getUserPicture).toHaveBeenCalledWith('test@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ image: mockImage });
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.params = { email: 'test@example.com' };

      const errorMessage = 'Erro ao buscar foto';
      userService.getUserPicture.mockRejectedValue(new Error(errorMessage));

      await userController.getUserPicture(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('updateAdminStatus', () => {
    it('deve atualizar o status de administrador com sucesso', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isAdmin: true,
      };

      req.body = {
        email: 'test@example.com',
        isAdmin: true,
      };

      userService.updateAdminStatus.mockResolvedValue(mockUser);

      await userController.updateAdminStatus(req, res);

      expect(userService.updateAdminStatus).toHaveBeenCalledWith(
        'test@example.com',
        true
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.body = {
        email: 'test@example.com',
        isAdmin: true,
      };

      const errorMessage = 'Erro ao atualizar status';
      userService.updateAdminStatus.mockRejectedValue(new Error(errorMessage));

      await userController.updateAdminStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('updateUserNameAndEmail', () => {
    it('deve atualizar nome e email com sucesso', async () => {
      const mockUser = {
        id: 1,
        name: 'New Name',
        email: 'newemail@example.com',
      };

      req.body = {
        email: 'newemail@example.com',
        name: 'New Name',
      };

      userService.updateUserNameAndEmail.mockResolvedValue(mockUser);

      await userController.updateUserNameAndEmail(req, res);

      expect(userService.updateUserNameAndEmail).toHaveBeenCalledWith(
        'newemail@example.com',
        'New Name'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('deve retornar erro 500 quando ocorre falha', async () => {
      req.body = {
        email: 'newemail@example.com',
        name: 'New Name',
      };

      const errorMessage = 'Erro ao atualizar usuário';
      userService.updateUserNameAndEmail.mockRejectedValue(
        new Error(errorMessage)
      );

      await userController.updateUserNameAndEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});

