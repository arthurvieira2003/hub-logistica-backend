const Transportadoras = require("../models/transportadoras.model");
const PrecosFaixas = require("../models/precosFaixas.model");

const getAllTransportadoras = async () => {
  try {
    const transportadoras = await Transportadoras.findAll({
      order: [["nome_transportadora", "ASC"]],
    });
    return transportadoras;
  } catch (error) {
    console.error("Erro ao buscar transportadoras:", error);
    throw error;
  }
};

const getTransportadoraById = async (id) => {
  try {
    const transportadora = await Transportadoras.findByPk(id);
    if (!transportadora) {
      throw new Error("Transportadora não encontrada");
    }
    return transportadora;
  } catch (error) {
    console.error("Erro ao buscar transportadora:", error);
    throw error;
  }
};

const createTransportadora = async (data) => {
  try {
    const transportadora = await Transportadoras.create(data);
    return transportadora;
  } catch (error) {
    console.error("Erro ao criar transportadora:", error);
    throw error;
  }
};

const updateTransportadora = async (id, data) => {
  try {
    const transportadora = await Transportadoras.findByPk(id);
    if (!transportadora) {
      throw new Error("Transportadora não encontrada");
    }
    await transportadora.update(data);
    return transportadora;
  } catch (error) {
    console.error("Erro ao atualizar transportadora:", error);
    throw error;
  }
};

const deleteTransportadora = async (id) => {
  try {
    const transportadora = await Transportadoras.findByPk(id);
    if (!transportadora) {
      throw new Error("Transportadora não encontrada");
    }
    transportadora.ativa = false;
    await transportadora.save();
    return { message: "Transportadora desativada com sucesso" };
  } catch (error) {
    console.error("Erro ao desativar transportadora:", error);
    throw error;
  }
};

const countRelatedRecords = async (id) => {
  try {
    const precosCount = await PrecosFaixas.count({
      where: {
        id_transportadora: id,
        ativo: true,
      },
    });

    return {
      precosFaixas: precosCount,
    };
  } catch (error) {
    console.error("Erro ao contar registros relacionados:", error);
    throw error;
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
