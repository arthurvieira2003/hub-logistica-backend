// Mock do database.config antes de importar qualquer coisa
jest.mock("../../config/database.config", () => {
  return {
    define: jest.fn(),
  };
});

// Mock do tracking.model antes de importar o controller
jest.mock("../../models/tracking.model", () => {
  return {};
});

const ouroNegroController = require("../../controllers/ouroNegro.controller");
const ouroNegroService = require("../../services/ouroNegro.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

// Mock do serviço
jest.mock("../../services/ouroNegro.service");

describe("Ouro Negro Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getDadosOuroNegro", () => {
    it("deve retornar dados do Ouro Negro com sucesso", async () => {
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
      ouroNegroService.getDadosOuroNegro.mockResolvedValue(mockDados);

      await ouroNegroController.getDadosOuroNegro(req, res);

      expect(ouroNegroService.getDadosOuroNegro).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDados);
    });

    it("deve retornar erro 400 quando apenas dataInicio é fornecida", async () => {
      req.query = { dataInicio: "2024-01-15" };

      await ouroNegroController.getDadosOuroNegro(req, res);

      expect(ouroNegroService.getDadosOuroNegro).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message:
          "Se uma data for fornecida, ambas dataInicio e dataFim devem ser informadas",
      });
    });

    it("deve retornar erro 400 quando apenas dataFim é fornecida", async () => {
      req.query = { dataFim: "2024-01-15" };

      await ouroNegroController.getDadosOuroNegro(req, res);

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

      ouroNegroService.getDadosOuroNegro.mockResolvedValue(mockDados);

      await ouroNegroController.getDadosOuroNegro(req, res);

      expect(ouroNegroService.getDadosOuroNegro).toHaveBeenCalledWith({
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
      ouroNegroService.getDadosOuroNegro.mockResolvedValue(mockDados);

      await ouroNegroController.getDadosOuroNegro(req, res);

      expect(ouroNegroService.getDadosOuroNegro).toHaveBeenCalledWith({
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
      ouroNegroService.getDadosOuroNegro.mockRejectedValue(
        new Error(errorMessage)
      );

      await ouroNegroController.getDadosOuroNegro(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Erro ao buscar dados",
        error: errorMessage,
      });
    });

    describe("getDadosOuroNegroPorData", () => {
      it("deve retornar dados do Ouro Negro por data com sucesso", async () => {
        const data = "2024-01-15";
        const mockDados = {
          status: "success",
          data: [{ docNum: "12345", cardName: "Cliente Teste" }],
        };

        req.params = { data };
        req.query = {};
        ouroNegroService.getDadosOuroNegroPorData.mockResolvedValue(mockDados);

        await ouroNegroController.getDadosOuroNegroPorData(req, res);

        expect(ouroNegroService.getDadosOuroNegroPorData).toHaveBeenCalledWith({
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

        await ouroNegroController.getDadosOuroNegroPorData(req, res);

        expect(
          ouroNegroService.getDadosOuroNegroPorData
        ).not.toHaveBeenCalled();
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

        ouroNegroService.getDadosOuroNegroPorData.mockResolvedValue(mockDados);

        await ouroNegroController.getDadosOuroNegroPorData(req, res);

        expect(ouroNegroService.getDadosOuroNegroPorData).toHaveBeenCalledWith({
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
        ouroNegroService.getDadosOuroNegroPorData.mockRejectedValue(
          new Error(errorMessage)
        );

        await ouroNegroController.getDadosOuroNegroPorData(req, res);

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
