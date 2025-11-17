jest.mock("../../config/database.config", () => {
  return {
    define: jest.fn(),
  };
});

jest.mock("../../models/tracking.model", () => {
  return {};
});

const princesaController = require("../../controllers/princesa.controller");
const princesaService = require("../../services/princesa.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/princesa.service");

describe("Princesa Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getDadosPrincesa", () => {
    it("deve retornar dados da Princesa com sucesso", async () => {
      const mockDados = {
        status: "success",
        data: [
          {
            docNum: "12345",
            cardName: "Cliente Teste",
            rastreamento: { codigo: "ABC123" },
          },
        ],
      };

      req.query = {};
      princesaService.getDadosPrincesa.mockResolvedValue(mockDados);

      await princesaController.getDadosPrincesa(req, res);

      expect(princesaService.getDadosPrincesa).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDados);
    });

    it("deve retornar erro 400 quando apenas dataInicio é fornecida", async () => {
      req.query = { dataInicio: "2024-01-15" };

      await princesaController.getDadosPrincesa(req, res);

      expect(princesaService.getDadosPrincesa).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message:
          "Se uma data for fornecida, ambas dataInicio e dataFim devem ser informadas",
      });
    });

    it("deve retornar erro 400 quando apenas dataFim é fornecida", async () => {
      req.query = { dataFim: "2024-01-15" };

      await princesaController.getDadosPrincesa(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message:
          "Se uma data for fornecida, ambas dataInicio e dataFim devem ser informadas",
      });
    });

    it("deve passar parâmetros corretos para o serviço", async () => {
      const mockDados = { status: "success", data: [] };

      req.query = {
        forcarAtualizar: "true",
        horas: "6",
        dias: "2",
        dataInicio: "2024-01-15",
        dataFim: "2024-01-20",
      };

      princesaService.getDadosPrincesa.mockResolvedValue(mockDados);

      await princesaController.getDadosPrincesa(req, res);

      expect(princesaService.getDadosPrincesa).toHaveBeenCalledWith({
        forcarAtualizacao: true,
        horasParaAtualizar: 6,
        dias: 2,
        dataInicio: "2024-01-15",
        dataFim: "2024-01-20",
      });
    });

    it("deve usar valores padrão quando parâmetros não são fornecidos", async () => {
      const mockDados = { status: "success", data: [] };

      req.query = {};
      princesaService.getDadosPrincesa.mockResolvedValue(mockDados);

      await princesaController.getDadosPrincesa(req, res);

      expect(princesaService.getDadosPrincesa).toHaveBeenCalledWith({
        forcarAtualizacao: false,
        horasParaAtualizar: 4,
        dias: 1,
        dataInicio: null,
        dataFim: null,
      });
    });

    it("deve retornar erro 500 quando ocorre falha no serviço", async () => {
      const errorMessage = "Erro ao buscar dados";

      req.query = {};
      princesaService.getDadosPrincesa.mockRejectedValue(
        new Error(errorMessage)
      );

      await princesaController.getDadosPrincesa(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Erro ao buscar dados",
        error: errorMessage,
      });
    });

    describe("getDadosPrincesaPorData", () => {
      it("deve retornar dados da Princesa por data com sucesso", async () => {
        const data = "2024-01-15";
        const mockDados = {
          status: "success",
          data: [{ docNum: "12345", cardName: "Cliente Teste" }],
        };

        req.params = { data };
        req.query = {};
        princesaService.getDadosPrincesaPorData.mockResolvedValue(mockDados);

        await princesaController.getDadosPrincesaPorData(req, res);

        expect(princesaService.getDadosPrincesaPorData).toHaveBeenCalledWith({
          forcarAtualizacao: false,
          horasParaAtualizar: 4,
          dataEspecifica: data,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockDados);
      });

      it("deve retornar erro 400 quando formato de data é inválido", async () => {
        const dataInvalida = "15-01-2024";

        req.params = { data: dataInvalida };
        req.query = {};

        await princesaController.getDadosPrincesaPorData(req, res);

        expect(princesaService.getDadosPrincesaPorData).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          status: "error",
          message: "Formato de data inválido. Use o formato YYYY-MM-DD",
        });
      });

      it("deve passar parâmetros corretos para o serviço", async () => {
        const data = "2024-01-15";
        const mockDados = { status: "success", data: [] };

        req.params = { data };
        req.query = {
          forcarAtualizar: "true",
          horas: "6",
        };

        princesaService.getDadosPrincesaPorData.mockResolvedValue(mockDados);

        await princesaController.getDadosPrincesaPorData(req, res);

        expect(princesaService.getDadosPrincesaPorData).toHaveBeenCalledWith({
          forcarAtualizacao: true,
          horasParaAtualizar: 6,
          dataEspecifica: data,
        });
      });

      it("deve retornar erro 500 quando ocorre falha no serviço", async () => {
        const data = "2024-01-15";
        const errorMessage = "Erro ao buscar dados";

        req.params = { data };
        req.query = {};
        princesaService.getDadosPrincesaPorData.mockRejectedValue(
          new Error(errorMessage)
        );

        await princesaController.getDadosPrincesaPorData(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          status: "error",
          message: "Erro ao buscar dados",
          error: errorMessage,
        });
      });
    });
  });
});
