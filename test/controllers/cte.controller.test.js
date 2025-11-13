// Mock do database.config antes de importar qualquer coisa
jest.mock("../../config/database.config", () => {
  return {};
});

const cteController = require("../../controllers/cte.controller");
const cteService = require("../../services/cte.service");
const {
  createMockRequest,
  createMockResponse,
} = require("../helpers/mockFactory");

// Mock do serviço
jest.mock("../../services/cte.service");

describe("CTE Controller", () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe("getCTEs", () => {
    it("deve retornar lista de CTEs com sucesso", async () => {
      const mockCTEs = [
        {
          Serial: "12345678901234567890123456789012345678901234",
          CardName: "Cliente Teste",
          DateAdd: "2024-01-15",
          DocTotal: 1000.0,
        },
      ];

      cteService.getCTEs.mockResolvedValue(mockCTEs);

      await cteController.getCTEs(req, res);

      expect(cteService.getCTEs).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockCTEs);
    });

    it("deve retornar erro 500 quando ocorre falha", async () => {
      const errorMessage = "Erro ao buscar CTEs";
      cteService.getCTEs.mockRejectedValue(new Error(errorMessage));

      await cteController.getCTEs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Erro ao buscar CTEs",
        error: expect.any(Error),
      });
    });
  });

  describe("downloadXML", () => {
    it("deve fazer download do XML com sucesso", async () => {
      const serial = "12345678901234567890123456789012345678901234";
      const mockXmlContent = Buffer.from("<xml>test</xml>");

      req.params = { serial };
      cteService.getXMLBySerial.mockResolvedValue(mockXmlContent);

      await cteController.downloadXML(req, res);

      expect(cteService.getXMLBySerial).toHaveBeenCalledWith(serial);
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/xml"
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        `attachment; filename=${serial}.xml`
      );
      expect(res.send).toHaveBeenCalledWith(mockXmlContent);
    });

    it("deve retornar erro 404 quando XML não é encontrado", async () => {
      const serial = "99999999999999999999999999999999999999999999";

      req.params = { serial };
      cteService.getXMLBySerial.mockRejectedValue(
        new Error("XML não encontrado")
      );

      await cteController.downloadXML(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "XML não encontrado" });
    });
  });

  describe("downloadPDF", () => {
    it("deve fazer download do PDF com sucesso", async () => {
      const serial = "42345678901234567890123456789012345678901234";
      const mockPdfBuffer = Buffer.from("PDF content");

      req.params = { serial };
      cteService.getPDFByChave.mockResolvedValue(mockPdfBuffer);

      await cteController.downloadPDF(req, res);

      expect(cteService.getPDFByChave).toHaveBeenCalledWith(serial);
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        `attachment; filename=${serial}.pdf`
      );
      expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it("deve retornar erro 404 quando PDF não é encontrado", async () => {
      const serial = "99999999999999999999999999999999999999999999";

      req.params = { serial };
      cteService.getPDFByChave.mockRejectedValue(
        new Error("PDF não encontrado")
      );

      await cteController.downloadPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "PDF não encontrado" });
    });
  });
});
