const Estados = require("../models/estados.model");
const Cidades = require("../models/cidades.model");
const Rotas = require("../models/rotas.model");
const PrecosFaixas = require("../models/precosFaixas.model");
const { Op } = require("sequelize");

const getAllEstados = async () => {
  try {
    const estados = await Estados.findAll({
      order: [["nome_estado", "ASC"]],
    });
    return estados;
  } catch (error) {
    console.error("Erro ao buscar estados:", error);
    throw error;
  }
};

const getEstadoById = async (id) => {
  try {
    const estado = await Estados.findByPk(id);
    if (!estado) {
      throw new Error("Estado não encontrado");
    }
    return estado;
  } catch (error) {
    console.error("Erro ao buscar estado:", error);
    throw error;
  }
};

const createEstado = async (data) => {
  try {
    const estado = await Estados.create(data);
    return estado;
  } catch (error) {
    console.error("Erro ao criar estado:", error);
    throw error;
  }
};

const updateEstado = async (id, data) => {
  try {
    const estado = await Estados.findByPk(id);
    if (!estado) {
      throw new Error("Estado não encontrado");
    }
    await estado.update(data);
    return estado;
  } catch (error) {
    console.error("Erro ao atualizar estado:", error);
    throw error;
  }
};

const deleteEstado = async (id) => {
  try {
    const estado = await Estados.findByPk(id);
    if (!estado) {
      throw new Error("Estado não encontrado");
    }
    await estado.destroy();
    return { message: "Estado excluído com sucesso" };
  } catch (error) {
    console.error("Erro ao excluir estado:", error);
    throw error;
  }
};

const countRelatedRecords = async (id) => {
  try {
    // Contar cidades do estado
    const cidadesCount = await Cidades.count({
      where: { id_estado: id },
    });

    // Buscar todas as cidades do estado para contar rotas
    const cidades = await Cidades.findAll({
      where: { id_estado: id },
      attributes: ["id_cidade"],
    });
    const cidadeIds = cidades.map((c) => c.id_cidade);

    // Contar rotas que usam essas cidades como origem ou destino
    const rotasCount = await Rotas.count({
      where: {
        [Op.or]: [
          { id_cidade_origem: { [Op.in]: cidadeIds } },
          { id_cidade_destino: { [Op.in]: cidadeIds } },
        ],
      },
    });

    // Buscar todas as rotas para contar preços
    const rotas = await Rotas.findAll({
      where: {
        [Op.or]: [
          { id_cidade_origem: { [Op.in]: cidadeIds } },
          { id_cidade_destino: { [Op.in]: cidadeIds } },
        ],
      },
      attributes: ["id_rota"],
    });
    const rotaIds = rotas.map((r) => r.id_rota);

    // Contar preços de faixas dessas rotas
    const precosCount = rotaIds.length > 0 ? await PrecosFaixas.count({
      where: { id_rota: { [Op.in]: rotaIds } },
    }) : 0;

    return {
      cidades: cidadesCount,
      rotas: rotasCount,
      precosFaixas: precosCount,
    };
  } catch (error) {
    console.error("Erro ao contar registros relacionados:", error);
    throw error;
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
