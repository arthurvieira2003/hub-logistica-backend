const { Op, Sequelize } = require("sequelize");
const Rotas = require("../models/rotas.model");
const Cidades = require("../models/cidades.model");
const Estados = require("../models/estados.model");
const PrecosFaixas = require("../models/precosFaixas.model");

const getAllRotas = async (page = 1, limit = 50, search = null) => {
  try {
    const offset = (page - 1) * limit;

    // Prepara condições de busca
    let whereCondition = {};
    let includeCondition = [
      {
        model: Cidades,
        foreignKey: "id_cidade_origem",
        as: "CidadeOrigem",
        include: [
          {
            model: Estados,
            attributes: ["id_estado", "uf", "nome_estado"],
          },
        ],
      },
    ];

    // Se houver busca, adiciona condições
    if (search && search.trim() !== "") {
      const searchTerm = search.trim();

      // Busca cidades que correspondem ao termo de busca (case-insensitive)
      const searchTermLower = searchTerm.toLowerCase();
      const cidadesOrigem = await Cidades.findAll({
        where: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("nome_cidade")),
          Op.like,
          `%${searchTermLower}%`
        ),
        attributes: ["id_cidade"],
      });

      const cidadesDestino = await Cidades.findAll({
        where: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("nome_cidade")),
          Op.like,
          `%${searchTermLower}%`
        ),
        attributes: ["id_cidade"],
      });

      const cidadeIdsOrigem = cidadesOrigem.map((c) => c.id_cidade);
      const cidadeIdsDestino = cidadesDestino.map((c) => c.id_cidade);
      const allCidadeIds = [
        ...new Set([...cidadeIdsOrigem, ...cidadeIdsDestino]),
      ];

      // Verifica se o termo de busca é um número (ID da rota)
      const isNumeric = !isNaN(searchTerm) && !isNaN(parseInt(searchTerm));
      const rotaId = isNumeric ? parseInt(searchTerm) : null;

      // Monta a condição WHERE
      const conditions = [];

      if (allCidadeIds.length > 0) {
        conditions.push({
          [Op.or]: [
            { id_cidade_origem: { [Op.in]: allCidadeIds } },
            { id_cidade_destino: { [Op.in]: allCidadeIds } },
          ],
        });
      }

      if (rotaId !== null) {
        conditions.push({ id_rota: rotaId });
      }

      if (conditions.length > 0) {
        whereCondition = {
          [Op.or]: conditions,
        };
      } else {
        // Se não encontrou nenhuma cidade e não é um ID válido, retorna vazio
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

    // Busca o total de rotas com a condição de busca
    const totalRotas = await Rotas.count({
      where: whereCondition,
    });

    // Busca as rotas com paginação e busca
    const rotas = await Rotas.findAll({
      where: whereCondition,
      include: includeCondition,
      order: [[Sequelize.col("CidadeOrigem.nome_cidade"), "ASC"]],
      limit: limit,
      offset: offset,
    });

    // Busca as cidades de destino em batch para melhor performance
    const cidadeDestinoIds = [
      ...new Set(rotas.map((rota) => rota.id_cidade_destino)),
    ];
    const cidadesDestino = await Cidades.findAll({
      where: {
        id_cidade: {
          [Op.in]: cidadeDestinoIds,
        },
      },
      include: [
        {
          model: Estados,
          attributes: ["id_estado", "uf", "nome_estado"],
        },
      ],
    });

    // Cria um mapa para acesso rápido às cidades de destino
    const cidadesDestinoMap = {};
    cidadesDestino.forEach((cidade) => {
      cidadesDestinoMap[cidade.id_cidade] = cidade.toJSON();
    });

    const rotasCompletas = rotas.map((rota) => {
      const rotaData = rota.toJSON();
      rotaData.CidadeDestino =
        cidadesDestinoMap[rota.id_cidade_destino] || null;
      rotaData.Cidade = rotaData.CidadeOrigem;
      return rotaData;
    });

    return {
      data: rotasCompletas,
      pagination: {
        total: totalRotas,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalRotas / limit),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar rotas:", error);
    throw error;
  }
};

const getRotaById = async (id) => {
  try {
    const rota = await Rotas.findByPk(id, {
      include: [
        {
          model: Cidades,
          foreignKey: "id_cidade_origem",
          as: "CidadeOrigem",
          include: [
            {
              model: Estados,
              attributes: ["id_estado", "uf", "nome_estado"],
            },
          ],
        },
      ],
    });

    if (!rota) {
      throw new Error("Rota não encontrada");
    }

    const cidadeDestino = await Cidades.findByPk(rota.id_cidade_destino, {
      include: [
        {
          model: Estados,
          attributes: ["id_estado", "uf", "nome_estado"],
        },
      ],
    });

    const rotaData = rota.toJSON();
    rotaData.CidadeDestino = cidadeDestino ? cidadeDestino.toJSON() : null;
    rotaData.Cidade = rotaData.CidadeOrigem;

    return rotaData;
  } catch (error) {
    console.error("Erro ao buscar rota:", error);
    throw error;
  }
};

const createRota = async (data) => {
  try {
    if (data.id_cidade_origem === data.id_cidade_destino) {
      throw new Error("A cidade de origem e destino não podem ser iguais");
    }
    const rota = await Rotas.create(data);
    return await getRotaById(rota.id_rota);
  } catch (error) {
    console.error("Erro ao criar rota:", error);
    throw error;
  }
};

const updateRota = async (id, data) => {
  try {
    if (data.id_cidade_origem === data.id_cidade_destino) {
      throw new Error("A cidade de origem e destino não podem ser iguais");
    }
    const rota = await Rotas.findByPk(id);
    if (!rota) {
      throw new Error("Rota não encontrada");
    }
    await rota.update(data);
    return await getRotaById(id);
  } catch (error) {
    console.error("Erro ao atualizar rota:", error);
    throw error;
  }
};

const deleteRota = async (id) => {
  try {
    const rota = await Rotas.findByPk(id);
    if (!rota) {
      throw new Error("Rota não encontrada");
    }
    rota.ativa = false;
    await rota.save();
    return { message: "Rota desativada com sucesso" };
  } catch (error) {
    console.error("Erro ao desativar rota:", error);
    throw error;
  }
};

const countRelatedRecords = async (id) => {
  try {
    const precosCount = await PrecosFaixas.count({
      where: {
        id_rota: id,
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
  getAllRotas,
  getRotaById,
  createRota,
  updateRota,
  deleteRota,
  countRelatedRecords,
};
