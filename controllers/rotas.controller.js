const rotasService = require("../services/rotas.service");

const getAllRotas = async (req, res) => {
  try {
    const rotas = await rotasService.getAllRotas();
    res.status(200).json(rotas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRotaById = async (req, res) => {
  try {
    const { id } = req.params;
    const rota = await rotasService.getRotaById(id);
    res.status(200).json(rota);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createRota = async (req, res) => {
  try {
    const rota = await rotasService.createRota(req.body);
    res.status(201).json(rota);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateRota = async (req, res) => {
  try {
    const { id } = req.params;
    const rota = await rotasService.updateRota(id, req.body);
    res.status(200).json(rota);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRota = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await rotasService.deleteRota(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const countRelatedRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await rotasService.countRelatedRecords(id);
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllRotas,
  getRotaById,
  createRota,
  updateRota,
  deleteRota,
  countRelatedRecords,
};

