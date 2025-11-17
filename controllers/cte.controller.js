const cteService = require("../services/cte.service");
const precoValidationService = require("../services/precoValidation.service");

const getCTEs = async (req, res) => {
  try {
    const dataFiltro = req.query.data || null;
    const ctes = await cteService.getCTEs(dataFiltro);
    res.json(ctes);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar CTEs", error });
  }
};

const downloadXML = async (req, res) => {
  try {
    const { serial } = req.params;
    const xmlContent = await cteService.getXMLBySerial(serial);

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename=${serial}.xml`);
    res.send(xmlContent);
  } catch (error) {
    res.status(404).json({ error: "XML não encontrado" });
  }
};

const downloadPDF = async (req, res) => {
  try {
    const { serial } = req.params;
    const pdfBuffer = await cteService.getPDFByChave(serial);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${serial}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(404).json({ error: "PDF não encontrado" });
  }
};

const getCTEBySerial = async (req, res) => {
  try {
    const { serial } = req.params;
    const cte = await cteService.getCTEBySerial(serial);
    res.json(cte);
  } catch (error) {
    res
      .status(404)
      .json({ message: "CT-E não encontrado", error: error.message });
  }
};

const validarPrecoCTE = async (req, res) => {
  try {
    const { serial } = req.params;

    let cte;
    try {
      cte = await cteService.getCTEBySerial(serial);
    } catch (error) {
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({
          valido: false,
          motivo: "CT-e não encontrado",
          precoTabela: null,
          precoCTE: null,
          diferenca: null,
          percentualDiferenca: null,
        });
      }
      if (
        error.message.includes("NF-e") ||
        error.message.includes("não um CT-e") ||
        error.message.includes("não é um CT-e") ||
        error.message.includes("Estrutura XML não reconhecida")
      ) {
        return res.status(400).json({
          valido: false,
          motivo: "Documento não é um CT-e",
          precoTabela: null,
          precoCTE: null,
          diferenca: null,
          percentualDiferenca: null,
        });
      }
      throw error;
    }

    if (!cte) {
      return res.status(404).json({
        valido: false,
        motivo: "CT-e não encontrado",
        precoTabela: null,
        precoCTE: null,
        diferenca: null,
        percentualDiferenca: null,
      });
    }

    const validacao = await precoValidationService.validarPrecoCTE(cte);

    res.json(validacao);
  } catch (error) {
    res.status(500).json({
      valido: false,
      motivo: "Erro ao validar preço",
      precoTabela: null,
      precoCTE: null,
      diferenca: null,
      percentualDiferenca: null,
      error: error.message,
    });
  }
};

module.exports = {
  getCTEs,
  getCTEBySerial,
  downloadXML,
  downloadPDF,
  validarPrecoCTE,
};
