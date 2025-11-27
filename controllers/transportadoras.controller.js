const transportadorasService = require("../services/transportadoras.service");

const getAllTransportadoras = async (req, res) => {
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

    const result = await transportadorasService.getAllTransportadoras(page, limit, search);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransportadoraById = async (req, res) => {
  try {
    const { id } = req.params;
    const transportadora = await transportadorasService.getTransportadoraById(
      id
    );
    res.status(200).json(transportadora);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createTransportadora = async (req, res) => {
  try {
    const transportadora = await transportadorasService.createTransportadora(
      req.body
    );
    res.status(201).json(transportadora);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTransportadora = async (req, res) => {
  try {
    const { id } = req.params;
    const transportadora = await transportadorasService.updateTransportadora(
      id,
      req.body
    );
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
