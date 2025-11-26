const precosFaixasService = require("../services/precosFaixas.service");

const getAllPrecosFaixas = async (req, res) => {
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

    const result = await precosFaixasService.getAllPrecosFaixas(page, limit, search);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPrecoFaixaById = async (req, res) => {
  try {
    const { id } = req.params;
    const preco = await precosFaixasService.getPrecoFaixaById(id);
    res.status(200).json(preco);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createPrecoFaixa = async (req, res) => {
  try {
    const preco = await precosFaixasService.createPrecoFaixa(req.body);
    res.status(201).json(preco);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePrecoFaixa = async (req, res) => {
  try {
    const { id } = req.params;
    const preco = await precosFaixasService.updatePrecoFaixa(id, req.body);
    res.status(200).json(preco);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deletePrecoFaixa = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await precosFaixasService.deletePrecoFaixa(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllPrecosFaixas,
  getPrecoFaixaById,
  createPrecoFaixa,
  updatePrecoFaixa,
  deletePrecoFaixa,
};
