const FaixasPeso = require("../models/faixasPeso.model");
const PrecosFaixas = require("../models/precosFaixas.model");

const getAllFaixasPeso = async () => {
  try {
    const faixas = await FaixasPeso.findAll({
      order: [["ordem_faixa", "ASC"]],
    });
    return faixas;
  } catch (error) {
    console.error("Erro ao buscar faixas de peso:", error);
    throw error;
  }
};

const getFaixaPesoById = async (id) => {
  try {
    const faixa = await FaixasPeso.findByPk(id);
    if (!faixa) {
      throw new Error("Faixa de peso não encontrada");
    }
    return faixa;
  } catch (error) {
    console.error("Erro ao buscar faixa de peso:", error);
    throw error;
  }
};

const createFaixaPeso = async (data) => {
  try {
    const faixa = await FaixasPeso.create(data);
    return faixa;
  } catch (error) {
    console.error("Erro ao criar faixa de peso:", error);
    throw error;
  }
};

const updateFaixaPeso = async (id, data) => {
  try {
    const faixa = await FaixasPeso.findByPk(id);
    if (!faixa) {
      throw new Error("Faixa de peso não encontrada");
    }
    await faixa.update(data);
    return faixa;
  } catch (error) {
    console.error("Erro ao atualizar faixa de peso:", error);
    throw error;
  }
};

const deleteFaixaPeso = async (id) => {
  try {
    const faixa = await FaixasPeso.findByPk(id);
    if (!faixa) {
      throw new Error("Faixa de peso não encontrada");
    }
    // Desativar em vez de excluir (tem coluna ativa)
    faixa.ativa = false;
    await faixa.save();
    return { message: "Faixa de peso desativada com sucesso" };
  } catch (error) {
    console.error("Erro ao desativar faixa de peso:", error);
    throw error;
  }
};

const countRelatedRecords = async (id) => {
  try {
    // Contar preços de faixas ativos dessa faixa de peso
    // Nota: Como faixa será desativada (não excluída), os preços também serão desativados
    const precosCount = await PrecosFaixas.count({
      where: {
        id_faixa: id,
        ativo: true, // Apenas preços ativos serão afetados
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
  getAllFaixasPeso,
  getFaixaPesoById,
  createFaixaPeso,
  updateFaixaPeso,
  deleteFaixaPeso,
  countRelatedRecords,
};
