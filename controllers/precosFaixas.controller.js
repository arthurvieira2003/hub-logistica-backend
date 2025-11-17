const precosFaixasService = require("../services/precosFaixas.service");

const getAllPrecosFaixas = async (req, res) => {
  try {
    const precos = await precosFaixasService.getAllPrecosFaixas();
    res.status(200).json(precos);
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
