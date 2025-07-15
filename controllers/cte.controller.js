const cteService = require("../services/cte.service");

const getCTEs = async (req, res) => {
  try {
    const ctes = await cteService.getCTEs();
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
    res.setHeader("Content-Disposition", `attachment; filename=${chave}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(404).json({ error: "PDF não encontrado" });
  }
};

module.exports = {
  getCTEs,
  downloadXML,
  downloadPDF,
};
