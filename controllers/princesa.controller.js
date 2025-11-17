const princesaService = require("../services/princesa.service");

const getDadosPrincesa = async (req, res) => {
  try {
    const forcarAtualizacao = req.query.forcarAtualizar === "true";
    const horasParaAtualizar = req.query.horas ? parseInt(req.query.horas) : 4;
    const dias = req.query.dias ? parseInt(req.query.dias) : 1;
    const dataInicio = req.query.dataInicio || null;
    const dataFim = req.query.dataFim || null;

    if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
      return res.status(400).json({
        status: "error",
        message:
          "Se uma data for fornecida, ambas dataInicio e dataFim devem ser informadas",
      });
    }

    const options = {
      forcarAtualizacao,
      horasParaAtualizar,
      dias,
      dataInicio,
      dataFim,
    };

    const dados = await princesaService.getDadosPrincesa(options);
    res.status(200).json(dados);
  } catch (error) {
    console.error("Erro no controlador da Princesa:", error);
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar dados",
      error: error.message,
    });
  }
};

const getDadosPrincesaPorData = async (req, res) => {
  try {
    const data = req.params.data;
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(data)) {
      return res.status(400).json({
        status: "error",
        message: "Formato de data inválido. Use o formato YYYY-MM-DD",
      });
    }

    const forcarAtualizacao = req.query.forcarAtualizar === "true";
    const horasParaAtualizar = req.query.horas ? parseInt(req.query.horas) : 4;

    const options = {
      forcarAtualizacao,
      horasParaAtualizar,
      dataEspecifica: data,
    };

    const dados = await princesaService.getDadosPrincesaPorData(options);
    res.status(200).json(dados);
  } catch (error) {
    console.error("Erro no controlador da Princesa:", error);
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar dados",
      error: error.message,
    });
  }
};

module.exports = { getDadosPrincesa, getDadosPrincesaPorData };
