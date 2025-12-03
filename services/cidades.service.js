const Cidades = require("../models/cidades.model");
const Estados = require("../models/estados.model");
const Rotas = require("../models/rotas.model");
const PrecosFaixas = require("../models/precosFaixas.model");
const { Op, Sequelize } = require("sequelize");

const getAllCidades = async (page = 1, limit = 50, search = null) => {
  try {
    const offset = (page - 1) * limit;

    let whereCondition = {};
    let includeCondition = [
      {
        model: Estados,
        attributes: ["id_estado", "uf", "nome_estado"],
      },
    ];

    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      const searchTermLower = searchTerm.toLowerCase();

      const estados = await Estados.findAll({
        where: {
          [Op.or]: [
            Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("uf")),
              Op.like,
              `%${searchTermLower}%`
            ),
            Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("nome_estado")),
              Op.like,
              `%${searchTermLower}%`
            ),
          ],
        },
        attributes: ["id_estado"],
      });

      const estadoIds = estados.map((e) => e.id_estado);

      const isNumeric = !isNaN(searchTerm) && !isNaN(parseInt(searchTerm));
      const cidadeId = isNumeric ? parseInt(searchTerm) : null;

      const conditions = [];

      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("nome_cidade")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      if (estadoIds.length > 0) {
        conditions.push({ id_estado: { [Op.in]: estadoIds } });
      }

      if (cidadeId !== null) {
        conditions.push({ id_cidade: cidadeId });
        conditions.push({ codigo_ibge: cidadeId });
      }

      if (conditions.length > 0) {
        whereCondition = {
          [Op.or]: conditions,
        };
      } else {
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

    const totalCidades = await Cidades.count({
      where: whereCondition,
      distinct: true,
      col: "id_cidade",
    });

    const cidades = await Cidades.findAll({
      where: whereCondition,
      include: includeCondition,
      order: [["nome_cidade", "ASC"]],
      limit: limit,
      offset: offset,
    });

    return {
      data: cidades,
      pagination: {
        total: totalCidades,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCidades / limit),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar cidades:", error);
    throw error;
  }
};

const getCidadeById = async (id) => {
  try {
    const cidade = await Cidades.findByPk(id, {
      include: [
        {
          model: Estados,
          attributes: ["id_estado", "uf", "nome_estado"],
        },
      ],
    });
    if (!cidade) {
      throw new Error("Cidade não encontrada");
    }
    return cidade;
  } catch (error) {
    console.error("Erro ao buscar cidade:", error);
    throw error;
  }
};

const createCidade = async (data) => {
  try {
    const cidade = await Cidades.create(data);
    return await getCidadeById(cidade.id_cidade);
  } catch (error) {
    console.error("Erro ao criar cidade:", error);
    throw error;
  }
};

const updateCidade = async (id, data) => {
  try {
    const cidade = await Cidades.findByPk(id);
    if (!cidade) {
      throw new Error("Cidade não encontrada");
    }
    await cidade.update(data);
    return await getCidadeById(id);
  } catch (error) {
    console.error("Erro ao atualizar cidade:", error);
    throw error;
  }
};

const deleteCidade = async (id) => {
  try {
    const cidade = await Cidades.findByPk(id);
    if (!cidade) {
      throw new Error("Cidade não encontrada");
    }
    await cidade.destroy();
    return { message: "Cidade excluída com sucesso" };
  } catch (error) {
    console.error("Erro ao excluir cidade:", error);
    throw error;
  }
};

const countRelatedRecords = async (id) => {
  try {
    const rotasCount = await Rotas.count({
      where: {
        [Op.or]: [{ id_cidade_origem: id }, { id_cidade_destino: id }],
      },
    });

    const rotas = await Rotas.findAll({
      where: {
        [Op.or]: [{ id_cidade_origem: id }, { id_cidade_destino: id }],
      },
      attributes: ["id_rota"],
    });
    const rotaIds = rotas.map((r) => r.id_rota);

    let precosCount = 0;
    if (rotaIds.length > 0) {
      precosCount = await PrecosFaixas.count({
        where: { id_rota: { [Op.in]: rotaIds } },
      });
    }

    return {
      rotas: rotasCount,
      precosFaixas: precosCount,
    };
  } catch (error) {
    console.error("Erro ao contar registros relacionados:", error);
    throw error;
  }
};

const normalizarNome = (nome) => {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const limparNome = (n) => {
  return n
    .replace(/\b(de|da|do|das|dos|e|em|na|no|nas|nos)\b/g, "")
    .replace(/\s+/g, "")
    .trim();
};

const compararNomesMunicipio = (nomeMunicipio, nomeNormalizado) => {
  return (
    nomeMunicipio === nomeNormalizado ||
    nomeMunicipio.includes(nomeNormalizado) ||
    nomeNormalizado.includes(nomeMunicipio)
  );
};

const buscarMunicipioPorNome = (municipios, nomeNormalizado) => {
  for (const municipio of municipios) {
    const nomeMunicipio = normalizarNome(municipio.nome);
    if (compararNomesMunicipio(nomeMunicipio, nomeNormalizado)) {
      return municipio;
    }
  }
  return undefined;
};

const compararNomesFlexivel = (nomeMunicipio, nomeNormalizado) => {
  return limparNome(nomeMunicipio) === limparNome(nomeNormalizado);
};

const buscarMunicipioFlexivel = (municipios, nomeNormalizado) => {
  for (const municipio of municipios) {
    const nomeMunicipio = normalizarNome(municipio.nome);
    if (compararNomesFlexivel(nomeMunicipio, nomeNormalizado)) {
      return municipio;
    }
  }
  return undefined;
};

const processarRespostaIBGE = (data, nomeCidade) => {
  try {
    const municipios = JSON.parse(data);
    const nomeNormalizado = normalizarNome(nomeCidade);

    const municipio = buscarMunicipioPorNome(municipios, nomeNormalizado);

    if (municipio && municipio.id) {
      return { codigo_ibge: municipio.id };
    }

    const municipioFlexivel = buscarMunicipioFlexivel(
      municipios,
      nomeNormalizado
    );

    if (municipioFlexivel && municipioFlexivel.id) {
      return { codigo_ibge: municipioFlexivel.id };
    }

    return {
      codigo_ibge: null,
      message: "Código IBGE não encontrado",
    };
  } catch (error) {
    throw new Error("Erro ao processar resposta da API do IBGE");
  }
};

const criarHandlerResposta = (resolve) => {
  let data = "";

  const handleData = (chunk) => {
    data += chunk;
  };

  const handleEnd = () => {
    resolve(data);
  };

  return { handleData, handleEnd };
};

const fazerRequisicaoIBGE = (url) => {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const { handleData, handleEnd } = criarHandlerResposta(resolve);

    const handleError = (error) => {
      reject(new Error(`Erro ao buscar código IBGE: ${error.message}`));
    };

    https
      .get(url, (res) => {
        res.on("data", handleData);
        res.on("end", handleEnd);
      })
      .on("error", handleError);
  });
};

const buscarCodigoIBGE = async (nomeCidade, uf) => {
  try {
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
    const data = await fazerRequisicaoIBGE(url);
    return processarRespostaIBGE(data, nomeCidade);
  } catch (error) {
    console.error("Erro ao buscar código IBGE:", error);
    throw error;
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
