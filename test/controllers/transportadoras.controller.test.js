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
jest.mock("../../models/faixasPeso.model", () => mockModelInstance);
jest.mock("../../models/transportadoras.model", () => mockModelInstance);
jest.mock("../../models/precosFaixas.model", () => mockModelInstance);

const transportadorasController = require("../../controllers/transportadoras.controller");
const transportadorasService = require("../../services/transportadoras.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/transportadoras.service");

describe("Transportadoras Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getAllTransportadoras", () => {
    it("deve retornar lista de transportadoras com sucesso", async () => {
      const mockResult = {
        data: [{ id_transportadora: 1, nome_transportadora: "Transportadora Test" }],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      req.query = { page: "1", limit: "50" };
      transportadorasService.getAllTransportadoras.mockResolvedValue(mockResult);

      await transportadorasController.getAllTransportadoras(req, res);

      expect(transportadorasService.getAllTransportadoras).toHaveBeenCalledWith(1, 50, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando página é menor que 1", async () => {
      req.query = { page: "0", limit: "50" };
      res = createMockResponse();
      transportadorasService.getAllTransportadoras.mockClear();

      await transportadorasController.getAllTransportadoras(req, res);

      expect(transportadorasService.getAllTransportadoras).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "A página deve ser maior que 0",
      });
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.query = { page: "1", limit: "50" };
      const errorMessage = "Erro ao buscar transportadoras";
      transportadorasService.getAllTransportadoras.mockRejectedValue(new Error(errorMessage));

      await transportadorasController.getAllTransportadoras(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("getTransportadoraById", () => {
    it("deve retornar transportadora por ID com sucesso", async () => {
      const mockTransportadora = { id_transportadora: 1, nome_transportadora: "Transportadora Test" };
      req.params = { id: "1" };
      transportadorasService.getTransportadoraById.mockResolvedValue(mockTransportadora);

      await transportadorasController.getTransportadoraById(req, res);

      expect(transportadorasService.getTransportadoraById).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTransportadora);
    });

    it("deve retornar erro 404 quando transportadora não encontrada", async () => {
      req.params = { id: "999" };
      transportadorasService.getTransportadoraById.mockRejectedValue(
        new Error("Transportadora não encontrada")
      );

      await transportadorasController.getTransportadoraById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Transportadora não encontrada",
      });
    });
  });

  describe("createTransportadora", () => {
    it("deve criar transportadora com sucesso", async () => {
      const mockTransportadora = { id_transportadora: 1, nome_transportadora: "Transportadora Test" };
      req.body = { nome_transportadora: "Transportadora Test", cnpj: "12345678901234" };
      transportadorasService.createTransportadora.mockResolvedValue(mockTransportadora);

      await transportadorasController.createTransportadora(req, res);

      expect(transportadorasService.createTransportadora).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTransportadora);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.body = { nome_transportadora: "Transportadora Test" };
      const errorMessage = "Erro ao criar transportadora";
      transportadorasService.createTransportadora.mockRejectedValue(new Error(errorMessage));

      await transportadorasController.createTransportadora(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("updateTransportadora", () => {
    it("deve atualizar transportadora com sucesso", async () => {
      const mockTransportadora = { id_transportadora: 1, nome_transportadora: "Transportadora Atualizada" };
      req.params = { id: "1" };
      req.body = { nome_transportadora: "Transportadora Atualizada" };
      transportadorasService.updateTransportadora.mockResolvedValue(mockTransportadora);

      await transportadorasController.updateTransportadora(req, res);

      expect(transportadorasService.updateTransportadora).toHaveBeenCalledWith("1", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTransportadora);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      req.body = { nome_transportadora: "Transportadora Atualizada" };
      const errorMessage = "Erro ao atualizar transportadora";
      transportadorasService.updateTransportadora.mockRejectedValue(new Error(errorMessage));

      await transportadorasController.updateTransportadora(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("deleteTransportadora", () => {
    it("deve deletar transportadora com sucesso", async () => {
      const mockResult = { message: "Transportadora desativada com sucesso" };
      req.params = { id: "1" };
      transportadorasService.deleteTransportadora.mockResolvedValue(mockResult);

      await transportadorasController.deleteTransportadora(req, res);

      expect(transportadorasService.deleteTransportadora).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao deletar transportadora";
      transportadorasService.deleteTransportadora.mockRejectedValue(new Error(errorMessage));

      await transportadorasController.deleteTransportadora(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("countRelatedRecords", () => {
    it("deve retornar contagem de registros relacionados", async () => {
      const mockCounts = { precosFaixas: 10 };
      req.params = { id: "1" };
      transportadorasService.countRelatedRecords.mockResolvedValue(mockCounts);

      await transportadorasController.countRelatedRecords(req, res);

      expect(transportadorasService.countRelatedRecords).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCounts);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao contar registros";
      transportadorasService.countRelatedRecords.mockRejectedValue(
        new Error(errorMessage)
      );

      await transportadorasController.countRelatedRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});

