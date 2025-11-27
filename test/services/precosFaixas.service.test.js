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

const precosFaixasService = require("../../services/precosFaixas.service");
const PrecosFaixas = require("../../models/precosFaixas.model");
const Rotas = require("../../models/rotas.model");
const FaixasPeso = require("../../models/faixasPeso.model");
const Transportadoras = require("../../models/transportadoras.model");
const Cidades = require("../../models/cidades.model");
const Estados = require("../../models/estados.model");

describe("PrecosFaixas Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resetar os mocks para garantir isolamento entre testes
    PrecosFaixas.findByPk.mockReset();
    PrecosFaixas.findAll.mockReset();
    PrecosFaixas.create.mockReset();
    PrecosFaixas.count.mockReset();
    Cidades.findByPk.mockReset();
    Rotas.findByPk.mockReset();
  });

  describe("getAllPrecosFaixas", () => {
    it("deve retornar lista de preços sem busca", async () => {
      const mockPreco = {
        id_preco: 1,
        preco: 100.0,
        Rota: { id_rota: 1, id_cidade_destino: 1 },
        toJSON: jest.fn().mockReturnValue({
          id_preco: 1,
          preco: 100.0,
          Rota: { id_rota: 1, id_cidade_destino: 1 },
        }),
      };
      const mockCidade = {
        id_cidade: 1,
        nome_cidade: "Test",
        toJSON: jest
          .fn()
          .mockReturnValue({ id_cidade: 1, nome_cidade: "Test" }),
      };

      PrecosFaixas.count = jest.fn().mockResolvedValue(1);
      PrecosFaixas.findAll = jest.fn().mockResolvedValue([mockPreco]);
      // Criar uma nova instância do mock para cada cidade retornada
      const mockCidadeWithToJSON = {
        id_cidade: 1,
        nome_cidade: "Test",
        toJSON: jest
          .fn()
          .mockReturnValue({ id_cidade: 1, nome_cidade: "Test" }),
      };
      Cidades.findAll = jest.fn().mockResolvedValue([mockCidadeWithToJSON]);

      const result = await precosFaixasService.getAllPrecosFaixas(1, 50, null);

      expect(PrecosFaixas.count).toHaveBeenCalled();
      expect(PrecosFaixas.findAll).toHaveBeenCalled();
      expect(result.data).toBeDefined();
      expect(result.pagination.total).toBe(1);
      expect(Cidades.findAll).toHaveBeenCalled();
    });
  });

  describe("getPrecoFaixaById", () => {
    it("deve retornar preço por ID", async () => {
      const mockCidade = {
        id_cidade: 1,
        nome_cidade: "Test",
        toJSON: jest
          .fn()
          .mockReturnValue({ id_cidade: 1, nome_cidade: "Test" }),
      };
      const mockPreco = {
        id_preco: 1,
        preco: 100.0,
        Rota: { id_rota: 1, id_cidade_destino: 1 },
        toJSON: jest.fn().mockReturnValue({
          id_preco: 1,
          preco: 100.0,
          Rota: { id_rota: 1, id_cidade_destino: 1 },
        }),
      };

      PrecosFaixas.findByPk = jest.fn().mockResolvedValue(mockPreco);
      Cidades.findByPk = jest.fn().mockResolvedValue(mockCidade);

      const result = await precosFaixasService.getPrecoFaixaById(1);

      expect(PrecosFaixas.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(Cidades.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result).toBeDefined();
    });

    it("deve lançar erro quando preço não encontrado", async () => {
      PrecosFaixas.findByPk = jest.fn().mockResolvedValue(null);

      await expect(precosFaixasService.getPrecoFaixaById(999)).rejects.toThrow(
        "Preço de faixa não encontrado"
      );
    });
  });

  describe("createPrecoFaixa", () => {
    it("deve criar preço com sucesso", async () => {
      const mockData = {
        id_rota: 1,
        id_faixa: 1,
        id_transportadora: 1,
        preco: 100.0,
      };
      const mockCidade = {
        id_cidade: 1,
        nome_cidade: "Test",
        toJSON: jest
          .fn()
          .mockReturnValue({ id_cidade: 1, nome_cidade: "Test" }),
      };
      const createdPreco = {
        id_preco: 1,
        ...mockData,
      };
      const mockPreco = {
        id_preco: 1,
        ...mockData,
        Rota: { id_rota: 1, id_cidade_destino: 1 },
        toJSON: jest.fn().mockReturnValue({
          id_preco: 1,
          ...mockData,
          Rota: { id_rota: 1, id_cidade_destino: 1 },
        }),
      };

      PrecosFaixas.create = jest.fn().mockResolvedValue(createdPreco);
      // createPrecoFaixa chama getPrecoFaixaById, então precisa do mock com include
      PrecosFaixas.findByPk = jest.fn().mockResolvedValueOnce(mockPreco); // Para getPrecoFaixaById chamado por createPrecoFaixa
      Cidades.findByPk = jest.fn().mockResolvedValue(mockCidade);

      const result = await precosFaixasService.createPrecoFaixa(mockData);

      expect(PrecosFaixas.create).toHaveBeenCalledWith(mockData);
      expect(PrecosFaixas.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(Cidades.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result).toBeDefined();
    });
  });

  describe("updatePrecoFaixa", () => {
    it("deve lançar erro quando preço não encontrado", async () => {
      PrecosFaixas.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        precosFaixasService.updatePrecoFaixa(999, { preco: 150.0 })
      ).rejects.toThrow("Preço de faixa não encontrado");
    });
  });

  describe("deletePrecoFaixa", () => {
    it("deve desativar preço com sucesso", async () => {
      const mockPreco = {
        id_preco: 1,
        ativo: true,
        save: jest.fn().mockResolvedValue(true),
      };

      PrecosFaixas.findByPk = jest.fn().mockResolvedValue(mockPreco);

      const result = await precosFaixasService.deletePrecoFaixa(1);

      expect(mockPreco.ativo).toBe(false);
      expect(mockPreco.save).toHaveBeenCalled();
      expect(result.message).toBe("Preço de faixa desativado com sucesso");
    });

    it("deve lançar erro quando preço não encontrado", async () => {
      PrecosFaixas.findByPk = jest.fn().mockResolvedValue(null);

      await expect(precosFaixasService.deletePrecoFaixa(999)).rejects.toThrow(
        "Preço de faixa não encontrado"
      );
    });
  });
});
