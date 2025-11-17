jest.mock("../../models/user.model", () => {
  return {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };
});

jest.mock("../../models/session.model", () => {
  return {};
});

const userService = require("../../services/user.service");
const User = require("../../models/user.model");
const bcrypt = require("bcryptjs");
const sessionService = require("../../services/session.service");
const axios = require("axios");

jest.mock("bcryptjs");
jest.mock("../../services/session.service");
jest.mock("axios");

describe("User Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    it("deve criar um novo usuário com sucesso", async () => {
      const email = "test@example.com";
      const password = "password123";
      const mockUserSesuite = [
        {
          dsuseremail: email,
          nmuser: "Test User",
        },
      ];
      const mockUser = {
        id: 1,
        name: "Test User",
        email: email,
        password: "hashedPassword",
      };

      axios.get.mockResolvedValue({ data: mockUserSesuite });
      bcrypt.hash.mockResolvedValue("hashedPassword");
      User.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(email, password);

      expect(axios.get).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(User.create).toHaveBeenCalledWith({
        name: "Test User",
        email: email,
        password: "hashedPassword",
      });
      expect(result).toEqual(mockUser);
    });

    it("deve lançar erro quando usuário não é encontrado no Sesuite", async () => {
      const email = "notfound@example.com";
      const password = "password123";
      const mockUserSesuite = [];

      axios.get.mockResolvedValue({ data: mockUserSesuite });

      await expect(userService.createUser(email, password)).rejects.toThrow(
        "Usuário não encontrado ou desativado"
      );
      expect(User.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando ocorre falha na criação", async () => {
      const email = "test@example.com";
      const password = "password123";
      const mockUserSesuite = [
        {
          dsuseremail: email,
          nmuser: "Test User",
        },
      ];

      axios.get.mockResolvedValue({ data: mockUserSesuite });
      bcrypt.hash.mockResolvedValue("hashedPassword");
      User.create.mockRejectedValue(new Error("Database error"));

      await expect(userService.createUser(email, password)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("getUser", () => {
    it("deve retornar um usuário pelo ID", async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        name: "Test User",
        email: "test@example.com",
      };

      User.findByPk.mockResolvedValue(mockUser);

      const result = await userService.getUser(userId);

      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it("deve retornar null quando usuário não é encontrado", async () => {
      const userId = 999;

      User.findByPk.mockResolvedValue(null);

      const result = await userService.getUser(userId);

      expect(result).toBeNull();
    });
  });

  describe("updatePassword", () => {
    it("deve atualizar a senha do usuário", async () => {
      const email = "test@example.com";
      const newPassword = "newPassword123";
      const mockUser = {
        id: 1,
        email: email,
        password: "oldPassword",
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.updatePassword(email, newPassword);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockUser.password).toBe(newPassword);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it("deve lançar erro quando usuário não é encontrado", async () => {
      const email = "notfound@example.com";
      const newPassword = "newPassword123";

      User.findOne.mockResolvedValue(null);

      await expect(
        userService.updatePassword(email, newPassword)
      ).rejects.toThrow("Usuário não encontrado");
    });
  });

  describe("changeStatus", () => {
    it("deve alterar o status do usuário", async () => {
      const email = "test@example.com";
      const newStatus = "inactive";
      const mockUser = {
        id: 1,
        email: email,
        status: "active",
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.changeStatus(email, newStatus);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockUser.status).toBe(newStatus);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it("deve lançar erro quando usuário não é encontrado", async () => {
      const email = "notfound@example.com";
      const newStatus = "inactive";

      User.findOne.mockResolvedValue(null);

      await expect(userService.changeStatus(email, newStatus)).rejects.toThrow(
        "Usuário não encontrado"
      );
    });
  });

  describe("getAllUsers", () => {
    it("deve retornar todos os usuários", async () => {
      const mockUsers = [
        { id: 1, name: "User 1", email: "user1@example.com" },
        { id: 2, name: "User 2", email: "user2@example.com" },
      ];

      User.findAll.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(User.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe("authenticateUser", () => {
    it("deve autenticar usuário e retornar token", async () => {
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = "hashedPassword";
      const mockUser = {
        id: 1,
        email: email,
        password: hashedPassword,
      };
      const mockToken = "jwt-token";
      const mockRequest = {
        ip: "127.0.0.1",
        headers: { "user-agent": "test-agent" },
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      sessionService.generateToken.mockReturnValue(mockToken);
      sessionService.createSession.mockResolvedValue({});

      const result = await userService.authenticateUser(
        email,
        password,
        mockRequest
      );

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(sessionService.generateToken).toHaveBeenCalledWith(mockUser);
      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockUser.id,
        mockToken,
        mockRequest
      );
      expect(result).toBe(mockToken);
    });

    it("deve lançar erro quando usuário não é encontrado", async () => {
      const email = "notfound@example.com";
      const password = "password123";
      const mockRequest = {};

      User.findOne.mockResolvedValue(null);

      await expect(
        userService.authenticateUser(email, password, mockRequest)
      ).rejects.toThrow("Usuário não encontrado");
    });

    it("deve lançar erro quando senha é inválida", async () => {
      const email = "test@example.com";
      const password = "wrongPassword";
      const hashedPassword = "hashedPassword";
      const mockUser = {
        id: 1,
        email: email,
        password: hashedPassword,
      };
      const mockRequest = {};

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.authenticateUser(email, password, mockRequest)
      ).rejects.toThrow("Senha inválida");
    });
  });

  describe("updateUserPicture", () => {
    it("deve atualizar a foto de perfil do usuário", async () => {
      const email = "test@example.com";
      const image = "base64encodedimage";
      const mockUser = {
        id: 1,
        email: email,
        profile_picture: null,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.updateUserPicture(email, image);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockUser.profile_picture).toBe(image);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it("deve lançar erro quando usuário não é encontrado", async () => {
      const email = "notfound@example.com";
      const image = "base64encodedimage";

      User.findOne.mockResolvedValue(null);

      await expect(userService.updateUserPicture(email, image)).rejects.toThrow(
        "Usuário não encontrado"
      );
    });
  });

  describe("getUserPicture", () => {
    it("deve retornar a foto de perfil do usuário", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: 1,
        email: email,
        profile_picture: "base64encodedimage",
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.getUserPicture(email);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toBe("base64encodedimage");
    });
  });

  describe("updateAdminStatus", () => {
    it("deve atualizar o status de administrador", async () => {
      const email = "test@example.com";
      const isAdmin = true;
      const mockUser = {
        id: 1,
        email: email,
        isAdmin: false,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.updateAdminStatus(email, isAdmin);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockUser.isAdmin).toBe(isAdmin);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe("updateUserNameAndEmail", () => {
    it("deve atualizar nome e email do usuário", async () => {
      const email = "newemail@example.com";
      const name = "New Name";
      const mockUser = {
        id: 1,
        email: "oldemail@example.com",
        name: "Old Name",
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await userService.updateUserNameAndEmail(email, name);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockUser.email).toBe(email);
      expect(mockUser.name).toBe(name);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });
});
