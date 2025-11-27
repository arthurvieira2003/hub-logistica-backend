// Mock do database.config PRIMEIRO - antes de qualquer model ser carregado
const mockModelInstance = {
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
  belongsTo: jest.fn().mockReturnThis(),
  hasMany: jest.fn().mockReturnThis(),
  update: jest.fn(),
  destroy: jest.fn(),
};

jest.mock("../../config/database.config", () => ({
  define: jest.fn(() => mockModelInstance),
}));

// Mock dos models - DEVE SER ANTES de qualquer require
jest.mock("../../models/estados.model", () => mockModelInstance);
jest.mock("../../models/cidades.model", () => mockModelInstance);
jest.mock("../../models/rotas.model", () => mockModelInstance);
jest.mock("../../models/precosFaixas.model", () => mockModelInstance);

const rotasController = require("../../controllers/rotas.controller");
const rotasService = require("../../services/rotas.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/rotas.service");

describe("Rotas Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getAllRotas", () => {
    it("deve retornar lista de rotas com sucesso", async () => {
      const mockResult = {
        data: [{ id_rota: 1, id_cidade_origem: 1, id_cidade_destino: 2 }],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      req.query = { page: "1", limit: "50" };
      rotasService.getAllRotas.mockResolvedValue(mockResult);

      await rotasController.getAllRotas(req, res);

      expect(rotasService.getAllRotas).toHaveBeenCalledWith(1, 50, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando página é menor que 1", async () => {
      req.query = { page: "0", limit: "50" };
      res = createMockResponse();
      rotasService.getAllRotas.mockClear();

      await rotasController.getAllRotas(req, res);

      expect(rotasService.getAllRotas).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "A página deve ser maior que 0",
      });
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.query = { page: "1", limit: "50" };
      const errorMessage = "Erro ao buscar rotas";
      rotasService.getAllRotas.mockRejectedValue(new Error(errorMessage));

      await rotasController.getAllRotas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("getRotaById", () => {
    it("deve retornar rota por ID com sucesso", async () => {
      const mockRota = { id_rota: 1, id_cidade_origem: 1, id_cidade_destino: 2 };
      req.params = { id: "1" };
      rotasService.getRotaById.mockResolvedValue(mockRota);

      await rotasController.getRotaById(req, res);

      expect(rotasService.getRotaById).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRota);
    });

    it("deve retornar erro 404 quando rota não encontrada", async () => {
      req.params = { id: "999" };
      rotasService.getRotaById.mockRejectedValue(
        new Error("Rota não encontrada")
      );

      await rotasController.getRotaById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Rota não encontrada",
      });
    });
  });

  describe("createRota", () => {
    it("deve criar rota com sucesso", async () => {
      const mockRota = { id_rota: 1, id_cidade_origem: 1, id_cidade_destino: 2 };
      req.body = { id_cidade_origem: 1, id_cidade_destino: 2 };
      rotasService.createRota.mockResolvedValue(mockRota);

      await rotasController.createRota(req, res);

      expect(rotasService.createRota).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockRota);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.body = { id_cidade_origem: 1, id_cidade_destino: 2 };
      const errorMessage = "Erro ao criar rota";
      rotasService.createRota.mockRejectedValue(new Error(errorMessage));

      await rotasController.createRota(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("updateRota", () => {
    it("deve atualizar rota com sucesso", async () => {
      const mockRota = { id_rota: 1, id_cidade_origem: 1, id_cidade_destino: 3 };
      req.params = { id: "1" };
      req.body = { id_cidade_destino: 3 };
      rotasService.updateRota.mockResolvedValue(mockRota);

      await rotasController.updateRota(req, res);

      expect(rotasService.updateRota).toHaveBeenCalledWith("1", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRota);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      req.body = { id_cidade_destino: 3 };
      const errorMessage = "Erro ao atualizar rota";
      rotasService.updateRota.mockRejectedValue(new Error(errorMessage));

      await rotasController.updateRota(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("deleteRota", () => {
    it("deve deletar rota com sucesso", async () => {
      const mockResult = { message: "Rota desativada com sucesso" };
      req.params = { id: "1" };
      rotasService.deleteRota.mockResolvedValue(mockResult);

      await rotasController.deleteRota(req, res);

      expect(rotasService.deleteRota).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao deletar rota";
      rotasService.deleteRota.mockRejectedValue(new Error(errorMessage));

      await rotasController.deleteRota(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("countRelatedRecords", () => {
    it("deve retornar contagem de registros relacionados", async () => {
      const mockCounts = { precosFaixas: 10 };
      req.params = { id: "1" };
      rotasService.countRelatedRecords.mockResolvedValue(mockCounts);

      await rotasController.countRelatedRecords(req, res);

      expect(rotasService.countRelatedRecords).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCounts);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao contar registros";
      rotasService.countRelatedRecords.mockRejectedValue(
        new Error(errorMessage)
      );

      await rotasController.countRelatedRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});

