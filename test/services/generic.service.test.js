const genericService = require("../../services/generic.service");
const nfService = require("../../services/nf.service");
const carrierService = require("../../services/carrier.service");
const axios = require("axios");

// Mock dos módulos
jest.mock("../../services/nf.service");
jest.mock("../../services/carrier.service");
jest.mock("axios");

require("dotenv").config();

// Mock do setTimeout para controlar delays nos testes
jest.useFakeTimers();

describe("Generic Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe("getDadosGeneric", () => {
    it("deve retornar dados genéricos com sucesso", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          Carrier: "EXT001",
          CarrierName: "Transportadora Externa",
          BPLName: "Filial 1",
          CidadeOrigem: "São Paulo",
          EstadoOrigem: "SP",
          CidadeDestino: "Rio de Janeiro",
          EstadoDestino: "RJ",
          TaxIdNum: "12345678000190",
        },
      ];

      const mockTransportadoras = [{ CardCode: "INT001", CardName: "Copapel" }];

      const mockRastreamento = {
        codigo: "ABC123",
        status: "Em trânsito",
      };

      nfService.getNotas.mockResolvedValue(mockNotas);
      carrierService.getCarrier.mockResolvedValue(mockTransportadoras);
      axios.post.mockResolvedValue({
        data: mockRastreamento,
      });

      const result = await genericService.getDadosGeneric(dataEspecifica);

      expect(nfService.getNotas).toHaveBeenCalledWith(
        "",
        1,
        dataEspecifica,
        dataEspecifica
      );
      expect(carrierService.getCarrier).toHaveBeenCalled();
      expect(result).toHaveProperty("status", "success");
      expect(result).toHaveProperty("docNum", "12345");
    });

    it("deve retornar erro quando formato de data é inválido", async () => {
      const dataInvalida = "15-01-2024";

      const result = await genericService.getDadosGeneric(dataInvalida);

      expect(result).toEqual({
        status: "error",
        errorMessage: expect.stringContaining("Formato de data inválido"),
      });
    });

    it("deve retornar mensagem quando não há notas para a data", async () => {
      const dataEspecifica = "2024-01-15";

      nfService.getNotas.mockResolvedValue([]);

      const result = await genericService.getDadosGeneric(dataEspecifica);

      expect(result).toEqual({
        status: "success",
        message: `Nenhuma nota encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      });
    });

    it("deve filtrar notas de transportadoras internas", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          Serial: "12345678901234567890123456789012345678901234",
          Carrier: "INT001",
          CarrierName: "Copapel",
        },
      ];

      const mockTransportadoras = [{ CardCode: "INT001", CardName: "Copapel" }];

      nfService.getNotas.mockResolvedValue(mockNotas);
      carrierService.getCarrier.mockResolvedValue(mockTransportadoras);

      const result = await genericService.getDadosGeneric(dataEspecifica);

      expect(result).toEqual({
        status: "success",
        message: `Nenhuma nota de outras transportadoras encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      });
    });

    it("deve filtrar notas de Alfa e Ouro Negro", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          Serial: "12345678901234567890123456789012345678901234",
          Carrier: "EXT001",
          CarrierName: "Alfa Transportes",
        },
        {
          DocNum: "12346",
          Serial: "22345678901234567890123456789012345678901234",
          Carrier: "EXT002",
          CarrierName: "Transportes Ouro Negro",
        },
      ];

      nfService.getNotas.mockResolvedValue(mockNotas);
      carrierService.getCarrier.mockResolvedValue([]);

      const result = await genericService.getDadosGeneric(dataEspecifica);

      expect(result).toEqual({
        status: "success",
        message: `Nenhuma nota de outras transportadoras encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      });
    });

    it("deve retornar erro quando não consegue obter rastreamento", async () => {
      jest.useRealTimers();
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          Carrier: "EXT001",
          CarrierName: "Transportadora Externa",
          BPLName: "Filial 1",
          CidadeOrigem: "São Paulo",
          EstadoOrigem: "SP",
          CidadeDestino: "Rio de Janeiro",
          EstadoDestino: "RJ",
          TaxIdNum: "12345678000190",
        },
      ];

      nfService.getNotas.mockResolvedValue(mockNotas);
      carrierService.getCarrier.mockResolvedValue([]);
      axios.post.mockRejectedValue(new Error("Erro de conexão"));

      const result = await genericService.getDadosGeneric(dataEspecifica);

      // Quando há apenas uma nota, retorna objeto único
      expect(result).toHaveProperty("status", "error");
      expect(result).toHaveProperty("rastreamento", null);
      expect(result).toHaveProperty("errorMessage");
      jest.useFakeTimers();
    });

    it("deve retornar objeto único quando há apenas uma nota", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          Carrier: "EXT001",
          CarrierName: "Transportadora Externa",
          BPLName: "Filial 1",
          CidadeOrigem: "São Paulo",
          EstadoOrigem: "SP",
          CidadeDestino: "Rio de Janeiro",
          EstadoDestino: "RJ",
          TaxIdNum: "12345678000190",
        },
      ];

      const mockRastreamento = {
        codigo: "ABC123",
        status: "Em trânsito",
      };

      nfService.getNotas.mockResolvedValue(mockNotas);
      carrierService.getCarrier.mockResolvedValue([]);
      axios.post.mockResolvedValue({
        data: mockRastreamento,
      });

      const result = await genericService.getDadosGeneric(dataEspecifica);

      expect(result).toHaveProperty("docNum", "12345");
      expect(result).toHaveProperty("rastreamento", mockRastreamento);
      expect(Array.isArray(result)).toBe(false);
    });

    it("deve filtrar notas com carrier vazio", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          Serial: "12345678901234567890123456789012345678901234",
          Carrier: "",
          CarrierName: "Transportadora Externa",
        },
      ];

      nfService.getNotas.mockResolvedValue(mockNotas);
      carrierService.getCarrier.mockResolvedValue([]);

      const result = await genericService.getDadosGeneric(dataEspecifica);

      expect(result).toEqual({
        status: "success",
        message: `Nenhuma nota de outras transportadoras encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      });
    });
  });
});
