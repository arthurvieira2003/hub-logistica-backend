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

const cidadesService = require("../../services/cidades.service");
const Cidades = require("../../models/cidades.model");
const Estados = require("../../models/estados.model");
const Rotas = require("../../models/rotas.model");
const PrecosFaixas = require("../../models/precosFaixas.model");
const { Op, Sequelize } = require("sequelize");

describe("Cidades Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resetar os mocks para garantir isolamento entre testes
    Cidades.findByPk.mockReset();
    Cidades.findAll.mockReset();
    Cidades.count.mockReset();
    Rotas.count.mockReset();
    Rotas.findAll.mockReset();
    PrecosFaixas.count.mockReset();
  });

  describe("getAllCidades", () => {
    it("deve retornar lista de cidades sem busca", async () => {
      const mockCidades = [
        { id_cidade: 1, nome_cidade: "São Paulo", id_estado: 1 },
      ];
      const mockEstados = { id_estado: 1, uf: "SP", nome_estado: "São Paulo" };

      Cidades.count = jest.fn().mockResolvedValue(1);
      Cidades.findAll = jest.fn().mockResolvedValue(mockCidades);

      const result = await cidadesService.getAllCidades(1, 50, null);

      expect(Cidades.count).toHaveBeenCalled();
      expect(Cidades.findAll).toHaveBeenCalled();
      expect(result.data).toEqual(mockCidades);
      expect(result.pagination.total).toBe(1);
    });

    it("deve retornar lista vazia quando busca não encontra resultados", async () => {
      Estados.findAll = jest.fn().mockResolvedValue([]);
      Cidades.count = jest.fn().mockResolvedValue(0);
      Cidades.findAll = jest.fn().mockResolvedValue([]);

      const result = await cidadesService.getAllCidades(1, 50, "xyz123");

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("getCidadeById", () => {
    it("deve retornar cidade por ID", async () => {
      const mockCidade = {
        id_cidade: 1,
        nome_cidade: "São Paulo",
        id_estado: 1,
      };

      Cidades.findByPk = jest.fn().mockResolvedValue(mockCidade);

      const result = await cidadesService.getCidadeById(1);

      expect(Cidades.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result).toEqual(mockCidade);
    });

    it("deve lançar erro quando cidade não encontrada", async () => {
      Cidades.findByPk = jest.fn().mockResolvedValue(null);

      await expect(cidadesService.getCidadeById(999)).rejects.toThrow(
        "Cidade não encontrada"
      );
    });
  });

  describe("createCidade", () => {
    it("deve criar cidade com sucesso", async () => {
      const mockData = { nome_cidade: "São Paulo", id_estado: 1 };
      const mockCidade = { id_cidade: 1, ...mockData };

      Cidades.create = jest.fn().mockResolvedValue(mockCidade);
      Cidades.findByPk = jest.fn().mockResolvedValue(mockCidade);

      const result = await cidadesService.createCidade(mockData);

      expect(Cidades.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockCidade);
    });
  });

  describe("updateCidade", () => {
    it("deve atualizar cidade com sucesso", async () => {
      const mockCidade = {
        id_cidade: 1,
        nome_cidade: "São Paulo",
        update: jest.fn().mockResolvedValue(true),
      };
      const updateData = { nome_cidade: "São Paulo Atualizado" };

      Cidades.findByPk = jest.fn().mockResolvedValue(mockCidade);
      Cidades.findByPk.mockResolvedValueOnce(mockCidade).mockResolvedValueOnce({
        ...mockCidade,
        ...updateData,
      });

      await cidadesService.updateCidade(1, updateData);

      expect(mockCidade.update).toHaveBeenCalledWith(updateData);
    });

    it("deve lançar erro quando cidade não encontrada", async () => {
      Cidades.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        cidadesService.updateCidade(999, { nome_cidade: "Test" })
      ).rejects.toThrow("Cidade não encontrada");
    });
  });

  describe("deleteCidade", () => {
    it("deve deletar cidade com sucesso", async () => {
      const mockCidade = {
        id_cidade: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      Cidades.findByPk = jest.fn().mockResolvedValue(mockCidade);

      const result = await cidadesService.deleteCidade(1);

      expect(mockCidade.destroy).toHaveBeenCalled();
      expect(result.message).toBe("Cidade excluída com sucesso");
    });

    it("deve lançar erro quando cidade não encontrada", async () => {
      Cidades.findByPk = jest.fn().mockResolvedValue(null);

      await expect(cidadesService.deleteCidade(999)).rejects.toThrow(
        "Cidade não encontrada"
      );
    });
  });

});

