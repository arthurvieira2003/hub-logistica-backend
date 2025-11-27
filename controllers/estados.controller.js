const estadosService = require("../services/estados.service");

const getAllEstados = async (req, res) => {
  try {
    const page = req.query.page !== undefined ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 50;
    const search = req.query.search || null;
    
    // Validação dos parâmetros
    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: "A página deve ser maior que 0" });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: "O limite deve estar entre 1 e 100" });
    }

    const result = await estadosService.getAllEstados(page, limit, search);
    res.status(200).json(result);
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
