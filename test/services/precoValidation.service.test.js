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

const precoValidationService = require("../../services/precoValidation.service");
const PrecosFaixas = require("../../models/precosFaixas.model");
const Rotas = require("../../models/rotas.model");
const Cidades = require("../../models/cidades.model");
const Transportadoras = require("../../models/transportadoras.model");
const FaixasPeso = require("../../models/faixasPeso.model");
const Estados = require("../../models/estados.model");

describe("PrecoValidation Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validarPrecoCTE", () => {
    it("deve retornar erro quando dados insuficientes", async () => {
      const cteData = {
        remetente: {},
        destinatario: {},
        valores: { valorTotal: 100 },
      };

      const result = await precoValidationService.validarPrecoCTE(cteData);

      expect(result.valido).toBe(false);
      expect(result.motivo).toBe("Dados insuficientes");
    });

    it("deve retornar erro quando cidade de origem não encontrada", async () => {
      const cteData = {
        remetente: {
          endereco: { municipio: "Cidade Inexistente", uf: "XX" },
        },
        destinatario: {
          endereco: { municipio: "São Paulo", uf: "SP" },
        },
        emitente: { nome: "Transportadora Test" },
        valores: { valorTotal: 100 },
        carga: { quantidade: "10" },
      };

      Estados.findOne = jest.fn().mockResolvedValue(null);

      const result = await precoValidationService.validarPrecoCTE(cteData);

      expect(result.valido).toBe(false);
      expect(result.motivo).toBe("Cidade de origem não encontrada");
    });

    it("deve retornar erro quando cidade de destino não encontrada", async () => {
      const cteData = {
        remetente: {
          endereco: { municipio: "São Paulo", uf: "SP" },
        },
        destinatario: {
          endereco: { municipio: "Cidade Inexistente", uf: "XX" },
        },
        emitente: { nome: "Transportadora Test" },
        valores: { valorTotal: 100 },
        carga: { quantidade: "10" },
      };

      const mockEstadoOrigem = { id_estado: 1 };
      const mockEstadoDestino = { id_estado: 2 }; // Estado destino encontrado
      const mockCidadeOrigem = { id_cidade: 1, nome_cidade: "São Paulo" };

      Estados.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockEstadoOrigem) // Para origem
        .mockResolvedValueOnce(mockEstadoDestino); // Para destino - encontrado
      Cidades.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockCidadeOrigem) // Origem encontrada no findOne
        .mockResolvedValueOnce(null) // Destino não encontrado no findOne
        .mockResolvedValueOnce(null); // Destino não encontrado no findAll (segunda tentativa)
      Cidades.findAll = jest
        .fn()
        .mockResolvedValueOnce([mockCidadeOrigem]) // Para origem - não será usado porque findOne retorna
        .mockResolvedValueOnce([]); // Para destino - array vazio (cidade não encontrada)

      const result = await precoValidationService.validarPrecoCTE(cteData);

      expect(result.valido).toBe(false);
      expect(result.motivo).toBe("Cidade de destino não encontrada");
    });

    it("deve retornar erro quando transportadora não encontrada", async () => {
      const cteData = {
        remetente: {
          endereco: { municipio: "São Paulo", uf: "SP" },
        },
        destinatario: {
          endereco: { municipio: "Rio de Janeiro", uf: "RJ" },
        },
        emitente: { nome: "Transportadora Inexistente" },
        valores: { valorTotal: 100 },
        carga: { quantidade: "10" },
      };

      Estados.findOne = jest.fn().mockResolvedValue({ id_estado: 1 });
      Cidades.findOne = jest.fn().mockResolvedValue({ id_cidade: 1 });
      Transportadoras.findAll = jest.fn().mockResolvedValue([]);

      const result = await precoValidationService.validarPrecoCTE(cteData);

      expect(result.valido).toBe(false);
      expect(result.motivo).toBe("Transportadora não encontrada");
    });

    it("deve retornar erro quando rota não encontrada", async () => {
      const cteData = {
        remetente: {
          endereco: { municipio: "São Paulo", uf: "SP" },
        },
        destinatario: {
          endereco: { municipio: "Rio de Janeiro", uf: "RJ" },
        },
        emitente: { nome: "Transportadora Test" },
        valores: { valorTotal: 100 },
        carga: { quantidade: "10" },
      };

      const mockEstadoOrigem = { id_estado: 1 };
      const mockEstadoDestino = { id_estado: 2 };
      const mockCidadeOrigem = { id_cidade: 1, nome_cidade: "São Paulo" };
      const mockCidadeDestino = { id_cidade: 2, nome_cidade: "Rio de Janeiro" };
      const mockTransportadora = {
        id_transportadora: 1,
        nome_transportadora: "Transportadora Test",
        razao_social: "Transportadora Test LTDA",
      };

      // Limpar mocks antes de configurar
      jest.clearAllMocks();
      
      // Resetar os mocks para garantir que não há valores antigos
      Estados.findOne.mockReset();
      Cidades.findOne.mockReset();
      Cidades.findAll.mockReset();
      Transportadoras.findAll.mockReset();
      Rotas.findOne.mockReset();
      
      // buscarCidadePorNome faz: Estados.findOne, depois Cidades.findOne, e se não encontrar, Cidades.findAll
      // Para origem: Estados.findOne -> Cidades.findOne (encontra)
      // Para destino: Estados.findOne -> Cidades.findOne (encontra)
      Estados.findOne
        .mockResolvedValueOnce(mockEstadoOrigem) // Para origem - primeiro buscarCidadePorNome
        .mockResolvedValueOnce(mockEstadoDestino); // Para destino - segundo buscarCidadePorNome
      Cidades.findOne
        .mockResolvedValueOnce(mockCidadeOrigem) // Origem encontrada no findOne - primeiro buscarCidadePorNome
        .mockResolvedValueOnce(mockCidadeDestino); // Destino encontrado no findOne - segundo buscarCidadePorNome
      // Cidades.findAll não será chamado porque findOne retorna a cidade
      Cidades.findAll.mockResolvedValue([]);
      Transportadoras.findAll.mockResolvedValue([mockTransportadora]);
      Rotas.findOne.mockResolvedValue(null);

      const result = await precoValidationService.validarPrecoCTE(cteData);

      expect(result.valido).toBe(false);
      expect(result.motivo).toBe("Rota não encontrada");
    });

  });
});

