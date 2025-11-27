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
jest.mock("../../models/precosFaixas.model", () => mockModelInstance);

const faixasPesoController = require("../../controllers/faixasPeso.controller");
const faixasPesoService = require("../../services/faixasPeso.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/faixasPeso.service");

describe("FaixasPeso Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getAllFaixasPeso", () => {
    it("deve retornar lista de faixas com sucesso", async () => {
      const mockResult = {
        data: [{ id_faixa: 1, descricao: "0-1kg", peso_minimo: 0, peso_maximo: 1 }],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      req.query = { page: "1", limit: "50" };
      faixasPesoService.getAllFaixasPeso.mockResolvedValue(mockResult);

      await faixasPesoController.getAllFaixasPeso(req, res);

      expect(faixasPesoService.getAllFaixasPeso).toHaveBeenCalledWith(1, 50, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando página é menor que 1", async () => {
      req.query = { page: "0", limit: "50" };
      res = createMockResponse();
      faixasPesoService.getAllFaixasPeso.mockClear();

      await faixasPesoController.getAllFaixasPeso(req, res);

      expect(faixasPesoService.getAllFaixasPeso).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "A página deve ser maior que 0",
      });
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.query = { page: "1", limit: "50" };
      const errorMessage = "Erro ao buscar faixas";
      faixasPesoService.getAllFaixasPeso.mockRejectedValue(new Error(errorMessage));

      await faixasPesoController.getAllFaixasPeso(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("getFaixaPesoById", () => {
    it("deve retornar faixa por ID com sucesso", async () => {
      const mockFaixa = { id_faixa: 1, descricao: "0-1kg", peso_minimo: 0, peso_maximo: 1 };
      req.params = { id: "1" };
      faixasPesoService.getFaixaPesoById.mockResolvedValue(mockFaixa);

      await faixasPesoController.getFaixaPesoById(req, res);

      expect(faixasPesoService.getFaixaPesoById).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockFaixa);
    });

    it("deve retornar erro 404 quando faixa não encontrada", async () => {
      req.params = { id: "999" };
      faixasPesoService.getFaixaPesoById.mockRejectedValue(
        new Error("Faixa de peso não encontrada")
      );

      await faixasPesoController.getFaixaPesoById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Faixa de peso não encontrada",
      });
    });
  });

  describe("createFaixaPeso", () => {
    it("deve criar faixa com sucesso", async () => {
      const mockFaixa = { id_faixa: 1, descricao: "0-1kg", peso_minimo: 0, peso_maximo: 1 };
      req.body = { descricao: "0-1kg", peso_minimo: 0, peso_maximo: 1 };
      faixasPesoService.createFaixaPeso.mockResolvedValue(mockFaixa);

      await faixasPesoController.createFaixaPeso(req, res);

      expect(faixasPesoService.createFaixaPeso).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockFaixa);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.body = { descricao: "0-1kg" };
      const errorMessage = "Erro ao criar faixa";
      faixasPesoService.createFaixaPeso.mockRejectedValue(new Error(errorMessage));

      await faixasPesoController.createFaixaPeso(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("updateFaixaPeso", () => {
    it("deve atualizar faixa com sucesso", async () => {
      const mockFaixa = { id_faixa: 1, descricao: "0-2kg", peso_minimo: 0, peso_maximo: 2 };
      req.params = { id: "1" };
      req.body = { peso_maximo: 2 };
      faixasPesoService.updateFaixaPeso.mockResolvedValue(mockFaixa);

      await faixasPesoController.updateFaixaPeso(req, res);

      expect(faixasPesoService.updateFaixaPeso).toHaveBeenCalledWith("1", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockFaixa);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      req.body = { peso_maximo: 2 };
      const errorMessage = "Erro ao atualizar faixa";
      faixasPesoService.updateFaixaPeso.mockRejectedValue(new Error(errorMessage));

      await faixasPesoController.updateFaixaPeso(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("deleteFaixaPeso", () => {
    it("deve deletar faixa com sucesso", async () => {
      const mockResult = { message: "Faixa de peso desativada com sucesso" };
      req.params = { id: "1" };
      faixasPesoService.deleteFaixaPeso.mockResolvedValue(mockResult);

      await faixasPesoController.deleteFaixaPeso(req, res);

      expect(faixasPesoService.deleteFaixaPeso).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao deletar faixa";
      faixasPesoService.deleteFaixaPeso.mockRejectedValue(new Error(errorMessage));

      await faixasPesoController.deleteFaixaPeso(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("countRelatedRecords", () => {
    it("deve retornar contagem de registros relacionados", async () => {
      const mockCounts = { precosFaixas: 10 };
      req.params = { id: "1" };
      faixasPesoService.countRelatedRecords.mockResolvedValue(mockCounts);

      await faixasPesoController.countRelatedRecords(req, res);

      expect(faixasPesoService.countRelatedRecords).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCounts);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao contar registros";
      faixasPesoService.countRelatedRecords.mockRejectedValue(
        new Error(errorMessage)
      );

      await faixasPesoController.countRelatedRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});

