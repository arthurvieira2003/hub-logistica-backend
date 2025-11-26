const Estados = require("../models/estados.model");
const Cidades = require("../models/cidades.model");
const Rotas = require("../models/rotas.model");
const PrecosFaixas = require("../models/precosFaixas.model");
const { Op, Sequelize } = require("sequelize");

const getAllEstados = async (page = 1, limit = 50, search = null) => {
  try {
    const offset = (page - 1) * limit;

    // Prepara condições de busca
    let whereCondition = {};

    // Se houver busca, adiciona condições
    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      const searchTermLower = searchTerm.toLowerCase();

      // Verifica se o termo de busca é um número (ID do estado)
      const isNumeric = !isNaN(searchTerm) && !isNaN(parseInt(searchTerm));
      const estadoId = isNumeric ? parseInt(searchTerm) : null;

      // Monta a condição WHERE
      const conditions = [];

      // Busca por UF
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("uf")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por nome do estado
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("nome_estado")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por ID se for numérico
      if (estadoId !== null) {
        conditions.push({ id_estado: estadoId });
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

    // Busca o total de estados com a condição de busca
    const totalEstados = await Estados.count({
      where: whereCondition,
    });

    // Busca os estados com paginação e busca
    const estados = await Estados.findAll({
      where: whereCondition,
      order: [["uf", "ASC"]],
      limit: limit,
      offset: offset,
    });

    return {
      data: estados,
      pagination: {
        total: totalEstados,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalEstados / limit),
      },
    };
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
    const cidadesCount = await Cidades.count({
      where: { id_estado: id },
    });

    const cidades = await Cidades.findAll({
      where: { id_estado: id },
      attributes: ["id_cidade"],
    });
    const cidadeIds = cidades.map((c) => c.id_cidade);

    const rotasCount = await Rotas.count({
      where: {
        [Op.or]: [
          { id_cidade_origem: { [Op.in]: cidadeIds } },
          { id_cidade_destino: { [Op.in]: cidadeIds } },
        ],
      },
    });

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

    const precosCount =
      rotaIds.length > 0
        ? await PrecosFaixas.count({
            where: { id_rota: { [Op.in]: rotaIds } },
          })
        : 0;

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
