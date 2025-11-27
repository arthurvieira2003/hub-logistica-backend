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

const faixasPesoService = require("../../services/faixasPeso.service");
const FaixasPeso = require("../../models/faixasPeso.model");
const PrecosFaixas = require("../../models/precosFaixas.model");

describe("FaixasPeso Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllFaixasPeso", () => {
    it("deve retornar lista de faixas sem busca", async () => {
      const mockFaixas = [
        { id_faixa: 1, descricao: "0-1kg", peso_minimo: 0, peso_maximo: 1 },
      ];

      FaixasPeso.count = jest.fn().mockResolvedValue(1);
      FaixasPeso.findAll = jest.fn().mockResolvedValue(mockFaixas);

      const result = await faixasPesoService.getAllFaixasPeso(1, 50, null);

      expect(FaixasPeso.count).toHaveBeenCalled();
      expect(FaixasPeso.findAll).toHaveBeenCalled();
      expect(result.data).toEqual(mockFaixas);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getFaixaPesoById", () => {
    it("deve retornar faixa por ID", async () => {
      const mockFaixa = {
        id_faixa: 1,
        descricao: "0-1kg",
        peso_minimo: 0,
        peso_maximo: 1,
      };

      FaixasPeso.findByPk = jest.fn().mockResolvedValue(mockFaixa);

      const result = await faixasPesoService.getFaixaPesoById(1);

      expect(FaixasPeso.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFaixa);
    });

    it("deve lançar erro quando faixa não encontrada", async () => {
      FaixasPeso.findByPk = jest.fn().mockResolvedValue(null);

      await expect(faixasPesoService.getFaixaPesoById(999)).rejects.toThrow(
        "Faixa de peso não encontrada"
      );
    });
  });

  describe("createFaixaPeso", () => {
    it("deve criar faixa com sucesso", async () => {
      const mockData = {
        descricao: "0-1kg",
        peso_minimo: 0,
        peso_maximo: 1,
      };
      const mockFaixa = { id_faixa: 1, ...mockData };

      FaixasPeso.create = jest.fn().mockResolvedValue(mockFaixa);

      const result = await faixasPesoService.createFaixaPeso(mockData);

      expect(FaixasPeso.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockFaixa);
    });
  });

  describe("updateFaixaPeso", () => {
    it("deve atualizar faixa com sucesso", async () => {
      const mockFaixa = {
        id_faixa: 1,
        descricao: "0-1kg",
        update: jest.fn().mockResolvedValue(true),
      };
      const updateData = { peso_maximo: 2 };

      FaixasPeso.findByPk = jest.fn().mockResolvedValue(mockFaixa);

      await faixasPesoService.updateFaixaPeso(1, updateData);

      expect(mockFaixa.update).toHaveBeenCalledWith(updateData);
    });

    it("deve lançar erro quando faixa não encontrada", async () => {
      FaixasPeso.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        faixasPesoService.updateFaixaPeso(999, { peso_maximo: 2 })
      ).rejects.toThrow("Faixa de peso não encontrada");
    });
  });

  describe("deleteFaixaPeso", () => {
    it("deve desativar faixa com sucesso", async () => {
      const mockFaixa = {
        id_faixa: 1,
        ativa: true,
        save: jest.fn().mockResolvedValue(true),
      };

      FaixasPeso.findByPk = jest.fn().mockResolvedValue(mockFaixa);

      const result = await faixasPesoService.deleteFaixaPeso(1);

      expect(mockFaixa.ativa).toBe(false);
      expect(mockFaixa.save).toHaveBeenCalled();
      expect(result.message).toBe("Faixa de peso desativada com sucesso");
    });

    it("deve lançar erro quando faixa não encontrada", async () => {
      FaixasPeso.findByPk = jest.fn().mockResolvedValue(null);

      await expect(faixasPesoService.deleteFaixaPeso(999)).rejects.toThrow(
        "Faixa de peso não encontrada"
      );
    });
  });

  describe("countRelatedRecords", () => {
    it("deve contar registros relacionados", async () => {
      PrecosFaixas.count = jest.fn().mockResolvedValue(5);

      const result = await faixasPesoService.countRelatedRecords(1);

      expect(PrecosFaixas.count).toHaveBeenCalled();
      expect(result.precosFaixas).toBe(5);
    });
  });
});

