const estadosService = require("../services/estados.service");

const getAllEstados = async (req, res) => {
  try {
    const estados = await estadosService.getAllEstados();
    res.status(200).json(estados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEstadoById = async (req, res) => {
  try {
    const { id } = req.params;
    const estado = await estadosService.getEstadoById(id);
    res.status(200).json(estado);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createEstado = async (req, res) => {
  try {
    const estado = await estadosService.createEstado(req.body);
    res.status(201).json(estado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const estado = await estadosService.updateEstado(id, req.body);
    res.status(200).json(estado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await estadosService.deleteEstado(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const countRelatedRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await estadosService.countRelatedRecords(id);
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllEstados,
  getEstadoById,
  createEstado,
  updateEstado,
  deleteEstado,
  countRelatedRecords,
};
