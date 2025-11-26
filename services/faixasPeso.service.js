const FaixasPeso = require("../models/faixasPeso.model");
const PrecosFaixas = require("../models/precosFaixas.model");
const { Op, Sequelize } = require("sequelize");

const getAllFaixasPeso = async (page = 1, limit = 50, search = null) => {
  try {
    const offset = (page - 1) * limit;

    // Prepara condições de busca
    let whereCondition = {};

    // Se houver busca, adiciona condições
    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      const searchTermLower = searchTerm.toLowerCase();

      // Verifica se o termo de busca é um número
      const isNumeric = !isNaN(searchTerm) && !isNaN(parseFloat(searchTerm));
      const numericValue = isNumeric ? parseFloat(searchTerm) : null;

      // Monta a condição WHERE
      const conditions = [];

      // Busca por descrição
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("descricao")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por ID ou ordem se for numérico
      if (numericValue !== null) {
        conditions.push({ id_faixa: numericValue });
        conditions.push({ ordem_faixa: numericValue });
        conditions.push({ peso_minimo: numericValue });
        conditions.push({ peso_maximo: numericValue });
      }

      if (conditions.length > 0) {
        whereCondition = {
          [Op.or]: conditions,
        };
      } else {
        // Se não encontrou nada, retorna vazio
        return {
          data: [],
          pagination: {
            total: 0,
            page: page,
            limit: limit,
            totalPages: 0,
          },
        };
      }
    }

    // Busca o total de faixas com a condição de busca
    const totalFaixas = await FaixasPeso.count({
      where: whereCondition,
    });

    // Busca as faixas com paginação e busca
    const faixas = await FaixasPeso.findAll({
      where: whereCondition,
      order: [["peso_minimo", "ASC"]],
      limit: limit,
      offset: offset,
    });

    return {
      data: faixas,
      pagination: {
        total: totalFaixas,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalFaixas / limit),
      },
    };
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
    const precosCount = await PrecosFaixas.count({
      where: {
        id_faixa: id,
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
  getAllFaixasPeso,
  getFaixaPesoById,
  createFaixaPeso,
  updateFaixaPeso,
  deleteFaixaPeso,
  countRelatedRecords,
};
