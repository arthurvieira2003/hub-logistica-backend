const transportadorasService = require("../services/transportadoras.service");

const getAllTransportadoras = async (req, res) => {
  try {
    const transportadoras = await transportadorasService.getAllTransportadoras();
    res.status(200).json(transportadoras);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransportadoraById = async (req, res) => {
  try {
    const { id } = req.params;
    const transportadora = await transportadorasService.getTransportadoraById(id);
    res.status(200).json(transportadora);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createTransportadora = async (req, res) => {
  try {
    const transportadora = await transportadorasService.createTransportadora(req.body);
    res.status(201).json(transportadora);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTransportadora = async (req, res) => {
  try {
    const { id } = req.params;
    const transportadora = await transportadorasService.updateTransportadora(id, req.body);
    res.status(200).json(transportadora);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTransportadora = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await transportadorasService.deleteTransportadora(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const countRelatedRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await transportadorasService.countRelatedRecords(id);
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTransportadoras,
  getTransportadoraById,
  createTransportadora,
  updateTransportadora,
  deleteTransportadora,
  countRelatedRecords,
};

