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

const estadosService = require("../../services/estados.service");
const Estados = require("../../models/estados.model");
const Cidades = require("../../models/cidades.model");
const Rotas = require("../../models/rotas.model");
const PrecosFaixas = require("../../models/precosFaixas.model");

describe("Estados Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resetar os mocks para garantir isolamento entre testes
    Estados.findByPk.mockReset();
    Estados.findAll.mockReset();
    Estados.count.mockReset();
    Cidades.count.mockReset();
    Cidades.findAll.mockReset();
    Rotas.count.mockReset();
    Rotas.findAll.mockReset();
    PrecosFaixas.count.mockReset();
  });

  describe("getAllEstados", () => {
    it("deve retornar lista de estados sem busca", async () => {
      const mockEstados = [{ id_estado: 1, uf: "SP", nome_estado: "São Paulo" }];

      Estados.count = jest.fn().mockResolvedValue(1);
      Estados.findAll = jest.fn().mockResolvedValue(mockEstados);

      const result = await estadosService.getAllEstados(1, 50, null);

      expect(Estados.count).toHaveBeenCalled();
      expect(Estados.findAll).toHaveBeenCalled();
      expect(result.data).toEqual(mockEstados);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getEstadoById", () => {
    it("deve retornar estado por ID", async () => {
      const mockEstado = { id_estado: 1, uf: "SP", nome_estado: "São Paulo" };

      Estados.findByPk = jest.fn().mockResolvedValue(mockEstado);

      const result = await estadosService.getEstadoById(1);

      expect(Estados.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEstado);
    });

    it("deve lançar erro quando estado não encontrado", async () => {
      Estados.findByPk = jest.fn().mockResolvedValue(null);

      await expect(estadosService.getEstadoById(999)).rejects.toThrow(
        "Estado não encontrado"
      );
    });
  });

  describe("createEstado", () => {
    it("deve criar estado com sucesso", async () => {
      const mockData = { uf: "SP", nome_estado: "São Paulo" };
      const mockEstado = { id_estado: 1, ...mockData };

      Estados.create = jest.fn().mockResolvedValue(mockEstado);

      const result = await estadosService.createEstado(mockData);

      expect(Estados.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockEstado);
    });
  });

  describe("updateEstado", () => {
    it("deve atualizar estado com sucesso", async () => {
      const mockEstado = {
        id_estado: 1,
        uf: "SP",
        nome_estado: "São Paulo",
        update: jest.fn().mockResolvedValue(true),
      };
      const updateData = { nome_estado: "São Paulo Atualizado" };

      Estados.findByPk = jest.fn().mockResolvedValue(mockEstado);

      await estadosService.updateEstado(1, updateData);

      expect(mockEstado.update).toHaveBeenCalledWith(updateData);
    });

    it("deve lançar erro quando estado não encontrado", async () => {
      Estados.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        estadosService.updateEstado(999, { nome_estado: "Test" })
      ).rejects.toThrow("Estado não encontrado");
    });
  });

  describe("deleteEstado", () => {
    it("deve deletar estado com sucesso", async () => {
      const mockEstado = {
        id_estado: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      Estados.findByPk = jest.fn().mockResolvedValue(mockEstado);

      const result = await estadosService.deleteEstado(1);

      expect(mockEstado.destroy).toHaveBeenCalled();
      expect(result.message).toBe("Estado excluído com sucesso");
    });

    it("deve lançar erro quando estado não encontrado", async () => {
      Estados.findByPk = jest.fn().mockResolvedValue(null);

      await expect(estadosService.deleteEstado(999)).rejects.toThrow(
        "Estado não encontrado"
      );
    });
  });

});

