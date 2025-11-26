const Transportadoras = require("../models/transportadoras.model");
const PrecosFaixas = require("../models/precosFaixas.model");
const { Op, Sequelize } = require("sequelize");

const getAllTransportadoras = async (page = 1, limit = 50, search = null) => {
  try {
    const offset = (page - 1) * limit;

    // Prepara condições de busca
    let whereCondition = {};

    // Se houver busca, adiciona condições
    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      const searchTermLower = searchTerm.toLowerCase();

      // Verifica se o termo de busca é um número (ID da transportadora)
      const isNumeric = !isNaN(searchTerm) && !isNaN(parseInt(searchTerm));
      const transportadoraId = isNumeric ? parseInt(searchTerm) : null;

      // Monta a condição WHERE
      const conditions = [];

      // Busca por nome da transportadora
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("nome_transportadora")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por razão social
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("razao_social")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por CNPJ (busca direta, sem remover formatação)
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("cnpj")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por email
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("email")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por telefone (busca direta, sem remover formatação)
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("telefone")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por ID se for numérico
      if (transportadoraId !== null) {
        conditions.push({ id_transportadora: transportadoraId });
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

    // Busca o total de transportadoras com a condição de busca
    const totalTransportadoras = await Transportadoras.count({
      where: whereCondition,
    });

    // Busca as transportadoras com paginação e busca
    const transportadoras = await Transportadoras.findAll({
      where: whereCondition,
      order: [["nome_transportadora", "ASC"]],
      limit: limit,
      offset: offset,
    });

    return {
      data: transportadoras,
      pagination: {
        total: totalTransportadoras,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalTransportadoras / limit),
      },
    };
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
