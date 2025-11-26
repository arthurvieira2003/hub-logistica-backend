const rotasService = require("../services/rotas.service");

const getAllRotas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || null;
    
    // Validação dos parâmetros
    if (page < 1) {
      return res.status(400).json({ error: "A página deve ser maior que 0" });
    }
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: "O limite deve estar entre 1 e 100" });
    }

    const result = await rotasService.getAllRotas(page, limit, search);
    res.status(200).json(result);
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
