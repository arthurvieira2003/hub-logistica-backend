jest.mock("../../config/database.config", () => {
  return {};
});

const genericController = require("../../controllers/generic.controller");
const genericService = require("../../services/generic.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

jest.mock("../../services/generic.service");

describe("Generic Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getDadosGeneric", () => {
    it("deve retornar dados genéricos com sucesso", async () => {
      const dataEspecifica = "2024-01-15";
      const mockDados = {
        status: "success",
        docNum: "12345",
        cardName: "Cliente Teste",
        rastreamento: {
          codigo: "ABC123",
          status: "Em trânsito",
        },
      };

      req.params = { data: dataEspecifica };
      genericService.getDadosGeneric.mockResolvedValue(mockDados);

      await genericController.getDadosGeneric(req, res);

      expect(genericService.getDadosGeneric).toHaveBeenCalledWith(
        dataEspecifica
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDados);
    });

    it("deve retornar erro 400 quando formato de data é inválido", async () => {
      const dataInvalida = "15-01-2024";

      req.params = { data: dataInvalida };

      await genericController.getDadosGeneric(req, res);

      expect(genericService.getDadosGeneric).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Formato de data inválido. Use o formato YYYY-MM-DD",
      });
    });

    it("deve retornar erro 400 para formato de data inválido (formato curto)", async () => {
      const dataInvalida = "2024/01/15";

      req.params = { data: dataInvalida };

      await genericController.getDadosGeneric(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Formato de data inválido. Use o formato YYYY-MM-DD",
      });
    });

    it("deve retornar erro 500 quando ocorre falha no serviço", async () => {
      const dataEspecifica = "2024-01-15";
      const errorMessage = "Erro ao buscar dados";

      req.params = { data: dataEspecifica };
      genericService.getDadosGeneric.mockRejectedValue(new Error(errorMessage));

      await genericController.getDadosGeneric(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Erro ao buscar dados",
        error: errorMessage,
      });
    });

    it("deve validar formato de data corretamente (YYYY-MM-DD)", async () => {
      const dataValida = "2024-12-31";

      req.params = { data: dataValida };
      genericService.getDadosGeneric.mockResolvedValue({
        status: "success",
        data: [],
      });

      await genericController.getDadosGeneric(req, res);

      expect(genericService.getDadosGeneric).toHaveBeenCalledWith(dataValida);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
