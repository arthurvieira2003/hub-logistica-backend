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

const transportadorasService = require("../../services/transportadoras.service");
const Transportadoras = require("../../models/transportadoras.model");
const PrecosFaixas = require("../../models/precosFaixas.model");

describe("Transportadoras Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllTransportadoras", () => {
    it("deve retornar lista de transportadoras sem busca", async () => {
      const mockTransportadoras = [
        { id_transportadora: 1, nome_transportadora: "Transportadora Test" },
      ];

      Transportadoras.count = jest.fn().mockResolvedValue(1);
      Transportadoras.findAll = jest.fn().mockResolvedValue(mockTransportadoras);

      const result = await transportadorasService.getAllTransportadoras(1, 50, null);

      expect(Transportadoras.count).toHaveBeenCalled();
      expect(Transportadoras.findAll).toHaveBeenCalled();
      expect(result.data).toEqual(mockTransportadoras);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getTransportadoraById", () => {
    it("deve retornar transportadora por ID", async () => {
      const mockTransportadora = {
        id_transportadora: 1,
        nome_transportadora: "Transportadora Test",
      };

      Transportadoras.findByPk = jest.fn().mockResolvedValue(mockTransportadora);

      const result = await transportadorasService.getTransportadoraById(1);

      expect(Transportadoras.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTransportadora);
    });

    it("deve lançar erro quando transportadora não encontrada", async () => {
      Transportadoras.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        transportadorasService.getTransportadoraById(999)
      ).rejects.toThrow("Transportadora não encontrada");
    });
  });

  describe("createTransportadora", () => {
    it("deve criar transportadora com sucesso", async () => {
      const mockData = {
        nome_transportadora: "Transportadora Test",
        cnpj: "12345678901234",
      };
      const mockTransportadora = { id_transportadora: 1, ...mockData };

      Transportadoras.create = jest.fn().mockResolvedValue(mockTransportadora);

      const result = await transportadorasService.createTransportadora(mockData);

      expect(Transportadoras.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockTransportadora);
    });
  });

  describe("updateTransportadora", () => {
    it("deve atualizar transportadora com sucesso", async () => {
      const mockTransportadora = {
        id_transportadora: 1,
        nome_transportadora: "Transportadora Test",
        update: jest.fn().mockResolvedValue(true),
      };
      const updateData = { nome_transportadora: "Transportadora Atualizada" };

      Transportadoras.findByPk = jest.fn().mockResolvedValue(mockTransportadora);

      await transportadorasService.updateTransportadora(1, updateData);

      expect(mockTransportadora.update).toHaveBeenCalledWith(updateData);
    });

    it("deve lançar erro quando transportadora não encontrada", async () => {
      Transportadoras.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        transportadorasService.updateTransportadora(999, {
          nome_transportadora: "Test",
        })
      ).rejects.toThrow("Transportadora não encontrada");
    });
  });

  describe("deleteTransportadora", () => {
    it("deve desativar transportadora com sucesso", async () => {
      const mockTransportadora = {
        id_transportadora: 1,
        ativa: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Transportadoras.findByPk = jest.fn().mockResolvedValue(mockTransportadora);

      const result = await transportadorasService.deleteTransportadora(1);

      expect(mockTransportadora.ativa).toBe(false);
      expect(mockTransportadora.save).toHaveBeenCalled();
      expect(result.message).toBe("Transportadora desativada com sucesso");
    });

    it("deve lançar erro quando transportadora não encontrada", async () => {
      Transportadoras.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        transportadorasService.deleteTransportadora(999)
      ).rejects.toThrow("Transportadora não encontrada");
    });
  });

  describe("countRelatedRecords", () => {
    it("deve contar registros relacionados", async () => {
      PrecosFaixas.count = jest.fn().mockResolvedValue(5);

      const result = await transportadorasService.countRelatedRecords(1);

      expect(PrecosFaixas.count).toHaveBeenCalled();
      expect(result.precosFaixas).toBe(5);
    });
  });
});

