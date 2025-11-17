const nfService = require("../../services/nf.service");
const axios = require("axios");

jest.mock("axios");

require("dotenv").config();

describe("NF Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WS_URL = "https://test-ws.example.com";
    process.env.WS_TOKEN = "test-token";
  });

  describe("getNotas", () => {
    it("deve retornar notas com filtro por dias", async () => {
      const mockNotas = [
        {
          DocEntry: 1,
          DocNum: "12345",
          Serial: "12345678901234567890123456789012345678901234",
          CardName: "Cliente Teste",
          DocDate: "2024-01-15",
          TaxIdNum: "12.345.678/0001-90",
        },
      ];

      axios.get.mockResolvedValue({ data: mockNotas });

      const result = await nfService.getNotas("", 1);

      expect(axios.get).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].TaxIdNum).toBe("12345678000190");
    });

    it("deve retornar notas com filtro por data", async () => {
      const mockNotas = [
        {
          DocEntry: 1,
          DocNum: "12345",
          Serial: "12345678901234567890123456789012345678901234",
          TaxIdNum: "12.345.678/0001-90",
        },
      ];

      axios.get.mockResolvedValue({ data: mockNotas });

      const result = await nfService.getNotas(
        "alfa",
        1,
        "2024-01-15",
        "2024-01-15"
      );

      expect(axios.get).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].TaxIdNum).toBe("12345678000190");
    });

    it("deve retornar null quando formato de data é inválido", async () => {
      const result = await nfService.getNotas(
        "",
        1,
        "15-01-2024",
        "2024-01-15"
      );
      expect(result).toBeNull();
    });

    it("deve retornar null quando ambas as datas têm formato inválido", async () => {
      const result = await nfService.getNotas(
        "",
        1,
        "15-01-2024",
        "15-01-2024"
      );
      expect(result).toBeNull();
    });

    it("deve usar filtro de dias quando datas não são fornecidas", async () => {
      const mockNotas = [{ DocEntry: 1, TaxIdNum: "12.345.678/0001-90" }];
      axios.get.mockResolvedValue({ data: mockNotas });

      await nfService.getNotas("carrier", 5);

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain("ADD_DAYS");
      expect(callUrl).toContain("-5");
    });

    it("deve usar valor mínimo de 1 dia quando dias é inválido", async () => {
      const mockNotas = [{ DocEntry: 1, TaxIdNum: "12.345.678/0001-90" }];
      axios.get.mockResolvedValue({ data: mockNotas });

      await nfService.getNotas("carrier", 0);

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain("ADD_DAYS");
      expect(callUrl).toContain("-1");
    });

    it("deve usar valor mínimo de 1 dia quando dias é negativo", async () => {
      const mockNotas = [{ DocEntry: 1, TaxIdNum: "12.345.678/0001-90" }];
      axios.get.mockResolvedValue({ data: mockNotas });

      await nfService.getNotas("carrier", -5);

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain("-1");
    });

    it("deve formatar CNPJ removendo caracteres não numéricos", async () => {
      const mockNotas = [
        {
          DocEntry: 1,
          TaxIdNum: "12.345.678/0001-90",
        },
        {
          DocEntry: 2,
          TaxIdNum: "98.765.432/0001-10",
        },
      ];

      axios.get.mockResolvedValue({ data: mockNotas });

      const result = await nfService.getNotas("", 1);

      expect(result[0].TaxIdNum).toBe("12345678000190");
      expect(result[1].TaxIdNum).toBe("98765432000110");
    });

    it("deve retornar null quando ocorre erro", async () => {
      axios.get.mockRejectedValue(new Error("Erro de conexão"));

      const result = await nfService.getNotas("", 1);

      expect(result).toBeNull();
    });

    it("deve retornar array vazio quando não há notas", async () => {
      axios.get.mockResolvedValue({ data: [] });

      const result = await nfService.getNotas("", 1);

      expect(result).toEqual([]);
    });

    it("deve incluir filtro de carrier na query", async () => {
      const mockNotas = [{ DocEntry: 1, TaxIdNum: "12.345.678/0001-90" }];
      axios.get.mockResolvedValue({ data: mockNotas });

      await nfService.getNotas("alfa", 1);

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain("alfa");
    });
  });
});
