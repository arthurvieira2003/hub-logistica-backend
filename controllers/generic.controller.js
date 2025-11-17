const genericService = require("../services/generic.service");

const getDadosGeneric = async (req, res) => {
  try {
    const data = req.params.data;

    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(data)) {
      return res.status(400).json({
        status: "error",
        message: "Formato de data inválido. Use o formato YYYY-MM-DD",
      });
    }

    const dados = await genericService.getDadosGeneric(data);
    res.status(200).json(dados);
  } catch (error) {
    console.error("Erro no controlador genérico:", error);
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar dados",
      error: error.message,
    });
  }
};

module.exports = { getDadosGeneric };
