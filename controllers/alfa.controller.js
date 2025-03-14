const alfaService = require("../services/alfa.service");

const getDadosAlfa = async (req, res) => {
  try {
    const dados = await alfaService.getDadosAlfa();
    res.status(200).json(dados);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar dados" });
  }
};

module.exports = { getDadosAlfa };
