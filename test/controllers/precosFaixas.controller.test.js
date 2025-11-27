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

const precosFaixasController = require("../../controllers/precosFaixas.controller");
const precosFaixasService = require("../../services/precosFaixas.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/precosFaixas.service");

describe("PrecosFaixas Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getAllPrecosFaixas", () => {
    it("deve retornar lista de preços com sucesso", async () => {
      const mockResult = {
        data: [{ id_preco: 1, preco: 100.0 }],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      req.query = { page: "1", limit: "50" };
      precosFaixasService.getAllPrecosFaixas.mockResolvedValue(mockResult);

      await precosFaixasController.getAllPrecosFaixas(req, res);

      expect(precosFaixasService.getAllPrecosFaixas).toHaveBeenCalledWith(1, 50, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando página é menor que 1", async () => {
      req.query = { page: "0", limit: "50" };
      res = createMockResponse();
      precosFaixasService.getAllPrecosFaixas.mockClear();

      await precosFaixasController.getAllPrecosFaixas(req, res);

      expect(precosFaixasService.getAllPrecosFaixas).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "A página deve ser maior que 0",
      });
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.query = { page: "1", limit: "50" };
      const errorMessage = "Erro ao buscar preços";
      precosFaixasService.getAllPrecosFaixas.mockRejectedValue(new Error(errorMessage));

      await precosFaixasController.getAllPrecosFaixas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("getPrecoFaixaById", () => {
    it("deve retornar preço por ID com sucesso", async () => {
      const mockPreco = { id_preco: 1, preco: 100.0 };
      req.params = { id: "1" };
      precosFaixasService.getPrecoFaixaById.mockResolvedValue(mockPreco);

      await precosFaixasController.getPrecoFaixaById(req, res);

      expect(precosFaixasService.getPrecoFaixaById).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPreco);
    });

    it("deve retornar erro 404 quando preço não encontrado", async () => {
      req.params = { id: "999" };
      precosFaixasService.getPrecoFaixaById.mockRejectedValue(
        new Error("Preço de faixa não encontrado")
      );

      await precosFaixasController.getPrecoFaixaById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Preço de faixa não encontrado",
      });
    });
  });

  describe("createPrecoFaixa", () => {
    it("deve criar preço com sucesso", async () => {
      const mockPreco = { id_preco: 1, preco: 100.0 };
      req.body = { id_rota: 1, id_faixa: 1, id_transportadora: 1, preco: 100.0 };
      precosFaixasService.createPrecoFaixa.mockResolvedValue(mockPreco);

      await precosFaixasController.createPrecoFaixa(req, res);

      expect(precosFaixasService.createPrecoFaixa).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockPreco);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.body = { preco: 100.0 };
      const errorMessage = "Erro ao criar preço";
      precosFaixasService.createPrecoFaixa.mockRejectedValue(new Error(errorMessage));

      await precosFaixasController.createPrecoFaixa(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("updatePrecoFaixa", () => {
    it("deve atualizar preço com sucesso", async () => {
      const mockPreco = { id_preco: 1, preco: 150.0 };
      req.params = { id: "1" };
      req.body = { preco: 150.0 };
      precosFaixasService.updatePrecoFaixa.mockResolvedValue(mockPreco);

      await precosFaixasController.updatePrecoFaixa(req, res);

      expect(precosFaixasService.updatePrecoFaixa).toHaveBeenCalledWith("1", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPreco);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      req.body = { preco: 150.0 };
      const errorMessage = "Erro ao atualizar preço";
      precosFaixasService.updatePrecoFaixa.mockRejectedValue(new Error(errorMessage));

      await precosFaixasController.updatePrecoFaixa(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("deletePrecoFaixa", () => {
    it("deve deletar preço com sucesso", async () => {
      const mockResult = { message: "Preço de faixa desativado com sucesso" };
      req.params = { id: "1" };
      precosFaixasService.deletePrecoFaixa.mockResolvedValue(mockResult);

      await precosFaixasController.deletePrecoFaixa(req, res);

      expect(precosFaixasService.deletePrecoFaixa).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao deletar preço";
      precosFaixasService.deletePrecoFaixa.mockRejectedValue(new Error(errorMessage));

      await precosFaixasController.deletePrecoFaixa(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});

