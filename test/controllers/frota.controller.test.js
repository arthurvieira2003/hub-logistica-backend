// Mock do database.config antes de importar qualquer coisa
jest.mock("../../config/database.config", () => {
  return {};
});

const frotaController = require("../../controllers/frota.controller");
const frotaService = require("../../services/frota.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

// Mock do serviço
jest.mock("../../services/frota.service");

describe("Frota Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getFrota", () => {
    it("deve retornar dados da frota com sucesso", async () => {
      const mockFrota = [
        { id: 1, placa: "ABC1234", modelo: "Scania" },
        { id: 2, placa: "XYZ5678", modelo: "Volvo" },
      ];

      frotaService.getFrota.mockResolvedValue(mockFrota);

      await frotaController.getFrota(req, res);

      expect(frotaService.getFrota).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockFrota);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      const errorMessage = "Erro ao buscar frota";
      frotaService.getFrota.mockRejectedValue(new Error(errorMessage));

      await frotaController.getFrota(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
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
      ];

      frotaService.getManutencoes.mockResolvedValue(mockManutencoes);

      await frotaController.getManutencoes(req, res);

      expect(frotaService.getManutencoes).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockManutencoes);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      const errorMessage = "Erro ao buscar manutenções";
      frotaService.getManutencoes.mockRejectedValue(new Error(errorMessage));

      await frotaController.getManutencoes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});
