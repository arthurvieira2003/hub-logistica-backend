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

const rotasService = require("../../services/rotas.service");
const Rotas = require("../../models/rotas.model");
const Cidades = require("../../models/cidades.model");
const Estados = require("../../models/estados.model");
const PrecosFaixas = require("../../models/precosFaixas.model");

describe("Rotas Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resetar os mocks para garantir isolamento entre testes
    Rotas.findByPk.mockReset();
    Rotas.findAll.mockReset();
    Rotas.create.mockReset();
    Rotas.count.mockReset();
    Cidades.findByPk.mockReset();
    Cidades.findAll.mockReset();
  });

  describe("getAllRotas", () => {
    it("deve retornar lista de rotas sem busca", async () => {
      const mockRotas = [
        { id_rota: 1, id_cidade_origem: 1, id_cidade_destino: 2 },
      ];

      Rotas.count = jest.fn().mockResolvedValue(1);
      Rotas.findAll = jest.fn().mockResolvedValue(mockRotas);
      Cidades.findAll = jest.fn().mockResolvedValue([]);

      const result = await rotasService.getAllRotas(1, 50, null);

      expect(Rotas.count).toHaveBeenCalled();
      expect(Rotas.findAll).toHaveBeenCalled();
      expect(result.data).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getRotaById", () => {
    it("deve lançar erro quando rota não encontrada", async () => {
      Rotas.findByPk = jest.fn().mockResolvedValue(null);

      await expect(rotasService.getRotaById(999)).rejects.toThrow(
        "Rota não encontrada"
      );
    });
  });

  describe("createRota", () => {
    it("deve lançar erro quando origem e destino são iguais", async () => {
      const mockData = { id_cidade_origem: 1, id_cidade_destino: 1 };

      await expect(rotasService.createRota(mockData)).rejects.toThrow(
        "A cidade de origem e destino não podem ser iguais"
      );
    });
  });

  describe("updateRota", () => {
    it("deve lançar erro quando origem e destino são iguais", async () => {
      const mockRota = {
        id_rota: 1,
        id_cidade_origem: 1,
        id_cidade_destino: 2,
      };
      const updateData = { id_cidade_origem: 1, id_cidade_destino: 1 };

      Rotas.findByPk = jest.fn().mockResolvedValue(mockRota);

      await expect(rotasService.updateRota(1, updateData)).rejects.toThrow(
        "A cidade de origem e destino não podem ser iguais"
      );
    });

    it("deve lançar erro quando rota não encontrada", async () => {
      Rotas.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        rotasService.updateRota(999, { id_cidade_destino: 3 })
      ).rejects.toThrow("Rota não encontrada");
    });
  });

  describe("deleteRota", () => {
    it("deve desativar rota com sucesso", async () => {
      const mockRota = {
        id_rota: 1,
        ativa: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Rotas.findByPk = jest.fn().mockResolvedValue(mockRota);

      const result = await rotasService.deleteRota(1);

      expect(mockRota.ativa).toBe(false);
      expect(mockRota.save).toHaveBeenCalled();
      expect(result.message).toBe("Rota desativada com sucesso");
    });

    it("deve lançar erro quando rota não encontrada", async () => {
      Rotas.findByPk = jest.fn().mockResolvedValue(null);

      await expect(rotasService.deleteRota(999)).rejects.toThrow(
        "Rota não encontrada"
      );
    });
  });

  describe("countRelatedRecords", () => {
    it("deve contar registros relacionados", async () => {
      PrecosFaixas.count = jest.fn().mockResolvedValue(5);

      const result = await rotasService.countRelatedRecords(1);

      expect(PrecosFaixas.count).toHaveBeenCalled();
      expect(result.precosFaixas).toBe(5);
    });
  });
});
