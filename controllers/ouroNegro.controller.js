const ouroNegroService = require("../services/ouroNegro.service");

const getDadosOuroNegro = async (req, res) => {
  try {
    const dados = await ouroNegroService.getDadosOuroNegro(req.body);
    res.status(200).json(dados);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar dados" });
  }
};

module.exports = { getDadosOuroNegro };
