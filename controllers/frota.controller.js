const frotaService = require("../services/frota.service");

const getFrota = async (req, res) => {
  try {
    const frota = await frotaService.getFrota();
    res.status(200).json(frota);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getManutencoes = async (req, res) => {
  try {
    const manutencoes = await frotaService.getManutencoes();
    res.status(200).json(manutencoes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getFrota, getManutencoes };
