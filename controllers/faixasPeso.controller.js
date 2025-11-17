const faixasPesoService = require("../services/faixasPeso.service");

const getAllFaixasPeso = async (req, res) => {
  try {
    const faixas = await faixasPesoService.getAllFaixasPeso();
    res.status(200).json(faixas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getFaixaPesoById = async (req, res) => {
  try {
    const { id } = req.params;
    const faixa = await faixasPesoService.getFaixaPesoById(id);
    res.status(200).json(faixa);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createFaixaPeso = async (req, res) => {
  try {
    const faixa = await faixasPesoService.createFaixaPeso(req.body);
    res.status(201).json(faixa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateFaixaPeso = async (req, res) => {
  try {
    const { id } = req.params;
    const faixa = await faixasPesoService.updateFaixaPeso(id, req.body);
    res.status(200).json(faixa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteFaixaPeso = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await faixasPesoService.deleteFaixaPeso(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const countRelatedRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await faixasPesoService.countRelatedRecords(id);
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllFaixasPeso,
  getFaixaPesoById,
  createFaixaPeso,
  updateFaixaPeso,
  deleteFaixaPeso,
  countRelatedRecords,
};
