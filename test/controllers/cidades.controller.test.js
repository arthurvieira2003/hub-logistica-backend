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

const cidadesController = require("../../controllers/cidades.controller");
const cidadesService = require("../../services/cidades.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/cidades.service");

describe("Cidades Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getAllCidades", () => {
    it("deve retornar lista de cidades com sucesso", async () => {
      const mockResult = {
        data: [{ id_cidade: 1, nome_cidade: "São Paulo" }],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };

      req.query = { page: "1", limit: "50" };
      cidadesService.getAllCidades.mockResolvedValue(mockResult);

      await cidadesController.getAllCidades(req, res);

      expect(cidadesService.getAllCidades).toHaveBeenCalledWith(1, 50, null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando página é menor que 1", async () => {
      req.query = { page: "0", limit: "50" };
      res = createMockResponse();
      cidadesService.getAllCidades.mockClear();

      await cidadesController.getAllCidades(req, res);

      expect(cidadesService.getAllCidades).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "A página deve ser maior que 0",
      });
    });

    it("deve retornar erro 400 quando limite é menor que 1", async () => {
      req.query = { page: "1", limit: "0" };
      res = createMockResponse();
      cidadesService.getAllCidades.mockClear();

      await cidadesController.getAllCidades(req, res);

      expect(cidadesService.getAllCidades).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "O limite deve estar entre 1 e 100",
      });
    });

    it("deve retornar erro 400 quando limite é maior que 100", async () => {
      req.query = { page: "1", limit: "101" };

      await cidadesController.getAllCidades(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "O limite deve estar entre 1 e 100",
      });
    });

    it("deve passar search para o service", async () => {
      const mockResult = { data: [], pagination: {} };
      req.query = { page: "1", limit: "50", search: "São Paulo" };
      cidadesService.getAllCidades.mockResolvedValue(mockResult);

      await cidadesController.getAllCidades(req, res);

      expect(cidadesService.getAllCidades).toHaveBeenCalledWith(
        1,
        50,
        "São Paulo"
      );
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.query = { page: "1", limit: "50" };
      const errorMessage = "Erro ao buscar cidades";
      cidadesService.getAllCidades.mockRejectedValue(new Error(errorMessage));

      await cidadesController.getAllCidades(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("getCidadeById", () => {
    it("deve retornar cidade por ID com sucesso", async () => {
      const mockCidade = { id_cidade: 1, nome_cidade: "São Paulo" };
      req.params = { id: "1" };
      cidadesService.getCidadeById.mockResolvedValue(mockCidade);

      await cidadesController.getCidadeById(req, res);

      expect(cidadesService.getCidadeById).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCidade);
    });

    it("deve retornar erro 404 quando cidade não encontrada", async () => {
      req.params = { id: "999" };
      cidadesService.getCidadeById.mockRejectedValue(
        new Error("Cidade não encontrada")
      );

      await cidadesController.getCidadeById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Cidade não encontrada",
      });
    });
  });

  describe("createCidade", () => {
    it("deve criar cidade com sucesso", async () => {
      const mockCidade = { id_cidade: 1, nome_cidade: "São Paulo" };
      req.body = { nome_cidade: "São Paulo", id_estado: 1 };
      cidadesService.createCidade.mockResolvedValue(mockCidade);

      await cidadesController.createCidade(req, res);

      expect(cidadesService.createCidade).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCidade);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.body = { nome_cidade: "São Paulo" };
      const errorMessage = "Erro ao criar cidade";
      cidadesService.createCidade.mockRejectedValue(new Error(errorMessage));

      await cidadesController.createCidade(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("updateCidade", () => {
    it("deve atualizar cidade com sucesso", async () => {
      const mockCidade = { id_cidade: 1, nome_cidade: "São Paulo Atualizado" };
      req.params = { id: "1" };
      req.body = { nome_cidade: "São Paulo Atualizado" };
      cidadesService.updateCidade.mockResolvedValue(mockCidade);

      await cidadesController.updateCidade(req, res);

      expect(cidadesService.updateCidade).toHaveBeenCalledWith("1", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCidade);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      req.body = { nome_cidade: "São Paulo" };
      const errorMessage = "Erro ao atualizar cidade";
      cidadesService.updateCidade.mockRejectedValue(new Error(errorMessage));

      await cidadesController.updateCidade(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("deleteCidade", () => {
    it("deve deletar cidade com sucesso", async () => {
      const mockResult = { message: "Cidade excluída com sucesso" };
      req.params = { id: "1" };
      cidadesService.deleteCidade.mockResolvedValue(mockResult);

      await cidadesController.deleteCidade(req, res);

      expect(cidadesService.deleteCidade).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao deletar cidade";
      cidadesService.deleteCidade.mockRejectedValue(new Error(errorMessage));

      await cidadesController.deleteCidade(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("countRelatedRecords", () => {
    it("deve retornar contagem de registros relacionados", async () => {
      const mockCounts = { rotas: 5, precosFaixas: 10 };
      req.params = { id: "1" };
      cidadesService.countRelatedRecords.mockResolvedValue(mockCounts);

      await cidadesController.countRelatedRecords(req, res);

      expect(cidadesService.countRelatedRecords).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCounts);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.params = { id: "1" };
      const errorMessage = "Erro ao contar registros";
      cidadesService.countRelatedRecords.mockRejectedValue(
        new Error(errorMessage)
      );

      await cidadesController.countRelatedRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe("buscarCodigoIBGE", () => {
    it("deve buscar código IBGE com sucesso", async () => {
      const mockResult = { codigo_ibge: 3550308 };
      req.query = { nome: "São Paulo", uf: "SP" };
      cidadesService.buscarCodigoIBGE.mockResolvedValue(mockResult);

      await cidadesController.buscarCodigoIBGE(req, res);

      expect(cidadesService.buscarCodigoIBGE).toHaveBeenCalledWith(
        "São Paulo",
        "SP"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it("deve retornar erro 400 quando nome não é fornecido", async () => {
      req.query = { uf: "SP" };

      await cidadesController.buscarCodigoIBGE(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Nome da cidade e UF são obrigatórios",
      });
    });

    it("deve retornar erro 400 quando UF não é fornecido", async () => {
      req.query = { nome: "São Paulo" };

      await cidadesController.buscarCodigoIBGE(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Nome da cidade e UF são obrigatórios",
      });
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      req.query = { nome: "São Paulo", uf: "SP" };
      const errorMessage = "Erro ao buscar código IBGE";
      cidadesService.buscarCodigoIBGE.mockRejectedValue(
        new Error(errorMessage)
      );

      await cidadesController.buscarCodigoIBGE(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});

