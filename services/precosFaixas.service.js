const { Op, Sequelize } = require("sequelize");
const PrecosFaixas = require("../models/precosFaixas.model");
const Rotas = require("../models/rotas.model");
const FaixasPeso = require("../models/faixasPeso.model");
const Transportadoras = require("../models/transportadoras.model");
const Cidades = require("../models/cidades.model");
const Estados = require("../models/estados.model");

const buscarCidadesPorTermo = async (searchTermLower) => {
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
  return [...new Set([...cidadeIdsOrigem, ...cidadeIdsDestino])];
};

const buscarTransportadorasPorTermo = async (searchTermLower) => {
  const transportadoras = await Transportadoras.findAll({
    where: Sequelize.where(
      Sequelize.fn("LOWER", Sequelize.col("nome_transportadora")),
      Op.like,
      `%${searchTermLower}%`
    ),
    attributes: ["id_transportadora"],
  });

  return transportadoras.map((t) => t.id_transportadora);
};

const buscarFaixasPorTermo = async (searchTermLower) => {
  const faixasPeso = await FaixasPeso.findAll({
    where: Sequelize.where(
      Sequelize.fn("LOWER", Sequelize.col("descricao")),
      Op.like,
      `%${searchTermLower}%`
    ),
    attributes: ["id_faixa"],
  });

  return faixasPeso.map((f) => f.id_faixa);
};

const buscarRotasPorCidades = async (cidadeIds) => {
  if (cidadeIds.length === 0) {
    return [];
  }

  const rotas = await Rotas.findAll({
    where: {
      [Op.or]: [
        { id_cidade_origem: { [Op.in]: cidadeIds } },
        { id_cidade_destino: { [Op.in]: cidadeIds } },
      ],
    },
    attributes: ["id_rota"],
  });

  return rotas.map((r) => r.id_rota);
};

const montarCondicoesBusca = (
  rotaIds,
  transportadoraIds,
  faixaIds,
  precoId
) => {
  const conditions = [];

  if (rotaIds.length > 0) {
    conditions.push({ id_rota: { [Op.in]: rotaIds } });
  }

  if (transportadoraIds.length > 0) {
    conditions.push({ id_transportadora: { [Op.in]: transportadoraIds } });
  }

  if (faixaIds.length > 0) {
    conditions.push({ id_faixa: { [Op.in]: faixaIds } });
  }

  if (precoId !== null) {
    conditions.push({ id_preco: precoId });
  }

  return conditions;
};

const criarWhereCondition = async (searchTerm) => {
  const searchTermLower = searchTerm.toLowerCase();

  const allCidadeIds = await buscarCidadesPorTermo(searchTermLower);
  const transportadoraIds = await buscarTransportadorasPorTermo(
    searchTermLower
  );
  const faixaIds = await buscarFaixasPorTermo(searchTermLower);

  const isNumeric = !isNaN(searchTerm) && !isNaN(parseInt(searchTerm));
  const precoId = isNumeric ? parseInt(searchTerm) : null;

  const rotaIds = await buscarRotasPorCidades(allCidadeIds);

  const conditions = montarCondicoesBusca(
    rotaIds,
    transportadoraIds,
    faixaIds,
    precoId
  );

  if (conditions.length === 0) {
    return null;
  }

  return { [Op.or]: conditions };
};

const processarPrecosComCidadesDestino = async (precos) => {
  const cidadeDestinoIds = [
    ...new Set(
      precos
        .map((preco) => preco.Rota?.id_cidade_destino)
        .filter((id) => id !== undefined)
    ),
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

  const cidadesDestinoMap = {};
  cidadesDestino.forEach((cidade) => {
    cidadesDestinoMap[cidade.id_cidade] = cidade.toJSON();
  });

  return precos.map((preco) => {
    const precoData = preco.toJSON();
    if (precoData.Rota) {
      precoData.Rota.CidadeDestino =
        cidadesDestinoMap[precoData.Rota.id_cidade_destino] || null;
      precoData.Rota.Cidade = precoData.Rota.CidadeOrigem;
    }
    return precoData;
  });
};

const criarIncludeOptions = () => {
  return [
    {
      model: Rotas,
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
    },
    {
      model: FaixasPeso,
    },
    {
      model: Transportadoras,
    },
  ];
};

const getAllPrecosFaixas = async (page = 1, limit = 50, search = null) => {
  try {
    const offset = (page - 1) * limit;
    let whereCondition = {};

    if (search && search.trim() !== "") {
      whereCondition = await criarWhereCondition(search.trim());
      if (!whereCondition) {
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

    const totalPrecos = await PrecosFaixas.count({
      where: whereCondition,
    });

    const precos = await PrecosFaixas.findAll({
      where: whereCondition,
      include: criarIncludeOptions(),
      order: [[Sequelize.col("Rota.CidadeOrigem.nome_cidade"), "ASC"]],
      limit: limit,
      offset: offset,
    });

    const precosCompletos = await processarPrecosComCidadesDestino(precos);

    return {
      data: precosCompletos,
      pagination: {
        total: totalPrecos,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalPrecos / limit),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar preços de faixas:", error);
    throw error;
  }
};

const getPrecoFaixaById = async (id) => {
  try {
    const preco = await PrecosFaixas.findByPk(id, {
      include: [
        {
          model: Rotas,
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
        },
        {
          model: FaixasPeso,
        },
        {
          model: Transportadoras,
        },
      ],
    });

    if (!preco) {
      throw new Error("Preço de faixa não encontrado");
    }

    const precoData = preco.toJSON();
    if (precoData.Rota) {
      const cidadeDestino = await Cidades.findByPk(
        precoData.Rota.id_cidade_destino,
        {
          include: [
            {
              model: Estados,
              attributes: ["id_estado", "uf", "nome_estado"],
            },
          ],
        }
      );
      precoData.Rota.CidadeDestino = cidadeDestino
        ? cidadeDestino.toJSON()
        : null;
      precoData.Rota.Cidade = precoData.Rota.CidadeOrigem;
    }

    return precoData;
  } catch (error) {
    console.error("Erro ao buscar preço de faixa:", error);
    throw error;
  }
};

const createPrecoFaixa = async (data) => {
  try {
    const preco = await PrecosFaixas.create(data);
    return await getPrecoFaixaById(preco.id_preco);
  } catch (error) {
    console.error("Erro ao criar preço de faixa:", error);
    throw error;
  }
};

const updatePrecoFaixa = async (id, data) => {
  try {
    const preco = await PrecosFaixas.findByPk(id);
    if (!preco) {
      throw new Error("Preço de faixa não encontrado");
    }
    await preco.update(data);
    return await getPrecoFaixaById(id);
  } catch (error) {
    console.error("Erro ao atualizar preço de faixa:", error);
    throw error;
  }
};

const deletePrecoFaixa = async (id) => {
  try {
    const preco = await PrecosFaixas.findByPk(id);
    if (!preco) {
      throw new Error("Preço de faixa não encontrado");
    }
    preco.ativo = false;
    await preco.save();
    return { message: "Preço de faixa desativado com sucesso" };
  } catch (error) {
    console.error("Erro ao desativar preço de faixa:", error);
    throw error;
  }
};

module.exports = {
  getAllPrecosFaixas,
  getPrecoFaixaById,
  createPrecoFaixa,
  updatePrecoFaixa,
  deletePrecoFaixa,
};
