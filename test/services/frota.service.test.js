const frotaService = require("../../services/frota.service");
const axios = require("axios");
const https = require("https");

// Mock dos módulos
jest.mock("axios");
jest.mock("https");

require("dotenv").config();

describe("Frota Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SE_URL = "https://test-api.example.com";
    process.env.SE_SECRET = "test-secret";
  });

  describe("getFrota", () => {
    it("deve retornar dados da frota com sucesso", async () => {
      const mockFrota = [
        { id: 1, placa: "ABC1234", modelo: "Scania" },
        { id: 2, placa: "XYZ5678", modelo: "Volvo" },
      ];

      axios.get = jest.fn().mockResolvedValue({ data: mockFrota });

      const result = await frotaService.getFrota();

      expect(axios.get).toHaveBeenCalledWith(
        `${process.env.SE_URL}/FrotaHubLog`,
        {
          headers: {
            Authorization: process.env.SE_SECRET,
          },
          httpsAgent: expect.any(https.Agent),
        }
      );
      expect(result).toEqual(mockFrota);
    });

    it("deve lançar erro quando a requisição falha", async () => {
      const errorMessage = "Erro de conexão";
      axios.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(frotaService.getFrota()).rejects.toThrow(errorMessage);
    });

    it("deve usar o agent HTTPS correto", async () => {
      const mockFrota = [{ id: 1, placa: "ABC1234" }];
      axios.get = jest.fn().mockResolvedValue({ data: mockFrota });

      await frotaService.getFrota();

      const callArgs = axios.get.mock.calls[0][1];
      expect(callArgs.httpsAgent).toBeInstanceOf(https.Agent);
      if (callArgs.httpsAgent.options) {
        expect(callArgs.httpsAgent.options.rejectUnauthorized).toBe(false);
      }
    });
  });

  describe("getManutencoes", () => {
    it("deve retornar dados de manutenções com sucesso", async () => {
      const mockManutencoes = [
        {
          id: 1,
          veiculo: "ABC1234",
          tipo: "Preventiva",
          data: "2024-01-15",
        },
        {
          id: 2,
          veiculo: "XYZ5678",
          tipo: "Corretiva",
          data: "2024-01-20",
        },
      ];

      axios.get = jest.fn().mockResolvedValue({ data: mockManutencoes });

      const result = await frotaService.getManutencoes();

      expect(axios.get).toHaveBeenCalledWith(
        `${process.env.SE_URL}/ManutencoesFrotaHubLog`,
        {
          headers: {
            Authorization: process.env.SE_SECRET,
          },
          httpsAgent: expect.any(https.Agent),
        }
      );
      expect(result).toEqual(mockManutencoes);
    });

    it("deve lançar erro quando a requisição falha", async () => {
      const errorMessage = "Erro ao buscar manutenções";
      axios.get = jest.fn().mockRejectedValue(new Error(errorMessage));

      await expect(frotaService.getManutencoes()).rejects.toThrow(errorMessage);
    });
  });
});
