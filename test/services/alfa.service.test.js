const alfaService = require("../../services/alfa.service");
const nfService = require("../../services/nf.service");
const axios = require("axios");
const xml2js = require("xml2js");

// Mock dos módulos
jest.mock("../../services/nf.service");
jest.mock("axios");
jest.mock("xml2js");

require("dotenv").config();

describe("Alfa Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALFA_URL = "https://test-alfa.example.com";
    process.env.ALFA_TOKEN = "test-token";
  });

  describe("getDadosAlfa", () => {
    it("deve retornar dados da Alfa com sucesso", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          CarrierName: "Alfa Transportes",
          BPLName: "Filial 1",
          TaxIdNum: "12345678000190",
        },
      ];

      const mockRastreamento = {
        codigo: "ABC123",
        status: "Em trânsito",
      };

      nfService.getNotas.mockResolvedValue(mockNotas);
      axios.post.mockResolvedValue({ data: mockRastreamento });

      const result = await alfaService.getDadosAlfa(dataEspecifica);

      expect(nfService.getNotas).toHaveBeenCalledWith(
        "alfa",
        1,
        dataEspecifica,
        dataEspecifica
      );
      expect(axios.post).toHaveBeenCalledWith(process.env.ALFA_URL, {
        idr: process.env.ALFA_TOKEN,
        merNF: mockNotas[0].Serial,
        cnpjTomador: mockNotas[0].TaxIdNum,
      });
      expect(result).toHaveProperty("docNum", "12345");
      expect(result).toHaveProperty("rastreamento", mockRastreamento);
    });

    it("deve retornar objeto de erro quando formato de data é inválido", async () => {
      const dataInvalida = "15-01-2024";

      const result = await alfaService.getDadosAlfa(dataInvalida);

      expect(result).toEqual({
        status: "error",
        errorMessage: expect.stringContaining("Formato de data inválido"),
      });
    });

    it("deve retornar mensagem quando não há notas", async () => {
      const dataEspecifica = "2024-01-15";

      nfService.getNotas.mockResolvedValue([]);

      const result = await alfaService.getDadosAlfa(dataEspecifica);

      expect(result).toEqual({
        status: "success",
        message: `Nenhuma nota encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      });
    });

    it("deve retornar null quando nfService retorna null", async () => {
      const dataEspecifica = "2024-01-15";

      nfService.getNotas.mockResolvedValue(null);

      const result = await alfaService.getDadosAlfa(dataEspecifica);

      expect(result).toEqual({
        status: "success",
        message: `Nenhuma nota encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      });
    });

    it("deve converter XML para JSON quando resposta é XML", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          CarrierName: "Alfa Transportes",
          BPLName: "Filial 1",
          TaxIdNum: "12345678000190",
        },
      ];

      const xmlResponse =
        '<?xml version="1.0"?><root><codigo>ABC123</codigo></root>';
      const mockParsedJson = { root: { codigo: "ABC123" } };

      nfService.getNotas.mockResolvedValue(mockNotas);
      axios.post.mockResolvedValue({ data: xmlResponse });

      const mockParser = {
        parseString: jest.fn((xml, callback) => {
          callback(null, mockParsedJson);
        }),
      };

      xml2js.Parser = jest.fn().mockImplementation(() => mockParser);

      const result = await alfaService.getDadosAlfa(dataEspecifica);

      expect(result).toHaveProperty("rastreamento", mockParsedJson);
    });

    it("deve lidar com erro ao converter XML para JSON", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          CarrierName: "Alfa Transportes",
          BPLName: "Filial 1",
          TaxIdNum: "12345678000190",
        },
      ];

      const xmlResponse = '<?xml version="1.0"?><invalid>';

      nfService.getNotas.mockResolvedValue(mockNotas);
      axios.post.mockResolvedValue({ data: xmlResponse });

      const mockParser = {
        parseString: jest.fn((xml, callback) => {
          callback(new Error("Erro ao parsear XML"), null);
        }),
      };

      xml2js.Parser = jest.fn().mockImplementation(() => mockParser);

      const result = await alfaService.getDadosAlfa(dataEspecifica);

      // Deve retornar o XML original quando falha a conversão
      expect(result).toHaveProperty("rastreamento");
    });

    it("deve retornar array quando há múltiplas notas", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente 1",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          CarrierName: "Alfa Transportes",
          BPLName: "Filial 1",
          TaxIdNum: "12345678000190",
        },
        {
          DocNum: "12346",
          DocEntry: 2,
          CardName: "Cliente 2",
          DocDate: "2024-01-15",
          Serial: "22345678901234567890123456789012345678901234",
          SeriesStr: "B",
          CarrierName: "Alfa Transportes",
          BPLName: "Filial 2",
          TaxIdNum: "98765432000110",
        },
      ];

      const mockRastreamento1 = { codigo: "ABC123" };
      const mockRastreamento2 = { codigo: "XYZ789" };

      nfService.getNotas.mockResolvedValue(mockNotas);
      axios.post
        .mockResolvedValueOnce({ data: mockRastreamento1 })
        .mockResolvedValueOnce({ data: mockRastreamento2 });

      const result = await alfaService.getDadosAlfa(dataEspecifica);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("rastreamento", mockRastreamento1);
      expect(result[1]).toHaveProperty("rastreamento", mockRastreamento2);
    });

    it("deve retornar erro quando ocorre falha na requisição", async () => {
      const dataEspecifica = "2024-01-15";
      const mockNotas = [
        {
          DocNum: "12345",
          DocEntry: 1,
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          Serial: "12345678901234567890123456789012345678901234",
          SeriesStr: "A",
          CarrierName: "Alfa Transportes",
          BPLName: "Filial 1",
          TaxIdNum: "12345678000190",
        },
      ];

      nfService.getNotas.mockResolvedValue(mockNotas);
      axios.post.mockRejectedValue(new Error("Erro de conexão"));

      const result = await alfaService.getDadosAlfa(dataEspecifica);

      expect(result).toEqual({
        status: "error",
        errorMessage: expect.stringContaining(
          "Falha ao consultar serviço da Alfa"
        ),
      });
    });
  });
});
