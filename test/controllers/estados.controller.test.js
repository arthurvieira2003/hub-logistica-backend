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

const estadosController = require("../../controllers/estados.controller");
const estadosService = require("../../services/estados.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/estados.service");

describe("Estados Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getAllEstados", () => {
    it("deve retornar lista de estados com sucesso", async () => {
      const mockResult = {
        data: [{ id_estado: 1, uf: "SP", nome_estado: "São Paulo" }],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      req.query = { page: "1", limit: "50" };
      estadosService.getAllEstados.mockResolvedValue(mockResult);

      await estadosController.getAllEstados(req, res);

      expect(estadosService.getAllEstados).toHaveBeenCalledWith(1, 50, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando página é menor que 1", async () => {
      req.query = { page: "0", limit: "50" };
      res = createMockResponse();
      estadosService.getAllEstados.mockClear();

      await estadosController.getAllEstados(req, res);

      expect(estadosService.getAllEstados).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "A página deve ser maior que 0",
      });
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.query = { page: "1", limit: "50" };
      const errorMessage = "Erro ao buscar estados";
      estadosService.getAllEstados.mockRejectedValue(new Error(errorMessage));

      await estadosController.getAllEstados(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("getEstadoById", () => {
    it("deve retornar estado por ID com sucesso", async () => {
      const mockEstado = { id_estado: 1, uf: "SP", nome_estado: "São Paulo" };
      req.params = { id: "1" };
      estadosService.getEstadoById.mockResolvedValue(mockEstado);

      await estadosController.getEstadoById(req, res);

      expect(estadosService.getEstadoById).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEstado);
    });

    it("deve retornar erro 404 quando estado não encontrado", async () => {
      req.params = { id: "999" };
      estadosService.getEstadoById.mockRejectedValue(
        new Error("Estado não encontrado")
      );

      await estadosController.getEstadoById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Estado não encontrado",
      });
    });
  });

  describe("createEstado", () => {
    it("deve criar estado com sucesso", async () => {
      const mockEstado = { id_estado: 1, uf: "SP", nome_estado: "São Paulo" };
      req.body = { uf: "SP", nome_estado: "São Paulo" };
      estadosService.createEstado.mockResolvedValue(mockEstado);

      await estadosController.createEstado(req, res);

      expect(estadosService.createEstado).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockEstado);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.body = { uf: "SP" };
      const errorMessage = "Erro ao criar estado";
      estadosService.createEstado.mockRejectedValue(new Error(errorMessage));

      await estadosController.createEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("updateEstado", () => {
    it("deve atualizar estado com sucesso", async () => {
      const mockEstado = { id_estado: 1, uf: "SP", nome_estado: "São Paulo" };
      req.params = { id: "1" };
      req.body = { nome_estado: "São Paulo Atualizado" };
      estadosService.updateEstado.mockResolvedValue(mockEstado);

      await estadosController.updateEstado(req, res);

      expect(estadosService.updateEstado).toHaveBeenCalledWith("1", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEstado);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      req.body = { nome_estado: "São Paulo" };
      const errorMessage = "Erro ao atualizar estado";
      estadosService.updateEstado.mockRejectedValue(new Error(errorMessage));

      await estadosController.updateEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("deleteEstado", () => {
    it("deve deletar estado com sucesso", async () => {
      const mockResult = { message: "Estado excluído com sucesso" };
      req.params = { id: "1" };
      estadosService.deleteEstado.mockResolvedValue(mockResult);

      await estadosController.deleteEstado(req, res);

      expect(estadosService.deleteEstado).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao deletar estado";
      estadosService.deleteEstado.mockRejectedValue(new Error(errorMessage));

      await estadosController.deleteEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("countRelatedRecords", () => {
    it("deve retornar contagem de registros relacionados", async () => {
      const mockCounts = { cidades: 5, rotas: 10, precosFaixas: 15 };
      req.params = { id: "1" };
      estadosService.countRelatedRecords.mockResolvedValue(mockCounts);

      await estadosController.countRelatedRecords(req, res);

      expect(estadosService.countRelatedRecords).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCounts);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao contar registros";
      estadosService.countRelatedRecords.mockRejectedValue(
        new Error(errorMessage)
      );

      await estadosController.countRelatedRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});

