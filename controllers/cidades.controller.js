const cidadesService = require("../services/cidades.service");

const getAllCidades = async (req, res) => {
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

    const result = await cidadesService.getAllCidades(page, limit, search);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCidadeById = async (req, res) => {
  try {
    const { id } = req.params;
    const cidade = await cidadesService.getCidadeById(id);
    res.status(200).json(cidade);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createCidade = async (req, res) => {
  try {
    const cidade = await cidadesService.createCidade(req.body);
    res.status(201).json(cidade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCidade = async (req, res) => {
  try {
    const { id } = req.params;
    const cidade = await cidadesService.updateCidade(id, req.body);
    res.status(200).json(cidade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCidade = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cidadesService.deleteCidade(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const countRelatedRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const counts = await cidadesService.countRelatedRecords(id);
    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const buscarCodigoIBGE = async (req, res) => {
  try {
    const { nome, uf } = req.query;

    if (!nome || !uf) {
      return res
        .status(400)
        .json({ error: "Nome da cidade e UF são obrigatórios" });
    }

    const result = await cidadesService.buscarCodigoIBGE(
      nome,
      uf.toUpperCase()
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllCidades,
  getCidadeById,
  createCidade,
  updateCidade,
  deleteCidade,
  countRelatedRecords,
  buscarCodigoIBGE,
};
