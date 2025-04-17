const ouroNegroService = require("../services/ouroNegro.service");

const getDadosOuroNegro = async (req, res) => {
  try {
    // Obter parâmetros de controle de cache da requisição
    const forcarAtualizacao = req.query.forcarAtualizar === "true";
    const horasParaAtualizar = req.query.horas ? parseInt(req.query.horas) : 4;
    const dias = req.query.dias ? parseInt(req.query.dias) : 1;

    // Obter parâmetros de intervalo de datas
    const dataInicio = req.query.dataInicio || null;
    const dataFim = req.query.dataFim || null;

    // Validar que se uma data foi fornecida, ambas devem estar presentes
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

    const dados = await ouroNegroService.getDadosOuroNegro(options);
    res.status(200).json(dados);
  } catch (error) {
    console.error("Erro no controlador da Ouro Negro:", error);
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar dados",
      error: error.message,
    });
  }
};

module.exports = { getDadosOuroNegro };
