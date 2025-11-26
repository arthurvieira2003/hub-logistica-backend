const Cidades = require("../models/cidades.model");
const Estados = require("../models/estados.model");
const Rotas = require("../models/rotas.model");
const PrecosFaixas = require("../models/precosFaixas.model");
const { Op, Sequelize } = require("sequelize");

const getAllCidades = async (page = 1, limit = 50, search = null) => {
  try {
    const offset = (page - 1) * limit;

    // Prepara condições de busca
    let whereCondition = {};
    let includeCondition = [
      {
        model: Estados,
        attributes: ["id_estado", "uf", "nome_estado"],
      },
    ];

    // Se houver busca, adiciona condições
    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      const searchTermLower = searchTerm.toLowerCase();

      // Busca estados que correspondem ao termo de busca
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

      // Verifica se o termo de busca é um número (ID da cidade ou código IBGE)
      const isNumeric = !isNaN(searchTerm) && !isNaN(parseInt(searchTerm));
      const cidadeId = isNumeric ? parseInt(searchTerm) : null;

      // Monta a condição WHERE
      const conditions = [];

      // Busca por nome de cidade
      conditions.push(
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("nome_cidade")),
          Op.like,
          `%${searchTermLower}%`
        )
      );

      // Busca por estado
      if (estadoIds.length > 0) {
        conditions.push({ id_estado: { [Op.in]: estadoIds } });
      }

      // Busca por ID ou código IBGE
      if (cidadeId !== null) {
        conditions.push({ id_cidade: cidadeId });
        conditions.push({ codigo_ibge: cidadeId });
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

    // Busca o total de cidades com a condição de busca
    const totalCidades = await Cidades.count({
      where: whereCondition,
      distinct: true,
      col: 'id_cidade',
    });

    // Busca as cidades com paginação e busca
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

const buscarCodigoIBGE = async (nomeCidade, uf) => {
  try {
    const https = require("https");
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const municipios = JSON.parse(data);

              const normalizarNome = (nome) => {
                return nome
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .trim();
              };

              const nomeNormalizado = normalizarNome(nomeCidade);

              const municipio = municipios.find((m) => {
                const nomeMunicipio = normalizarNome(m.nome);
                return (
                  nomeMunicipio === nomeNormalizado ||
                  nomeMunicipio.includes(nomeNormalizado) ||
                  nomeNormalizado.includes(nomeMunicipio)
                );
              });

              if (municipio && municipio.id) {
                resolve({ codigo_ibge: municipio.id });
              } else {
                const municipioFlexivel = municipios.find((m) => {
                  const nomeMunicipio = normalizarNome(m.nome);
                  const limparNome = (n) => {
                    return n
                      .replace(/\b(de|da|do|das|dos|e|em|na|no|nas|nos)\b/g, "")
                      .replace(/\s+/g, "")
                      .trim();
                  };
                  return (
                    limparNome(nomeMunicipio) === limparNome(nomeNormalizado)
                  );
                });

                if (municipioFlexivel && municipioFlexivel.id) {
                  resolve({ codigo_ibge: municipioFlexivel.id });
                } else {
                  resolve({
                    codigo_ibge: null,
                    message: "Código IBGE não encontrado",
                  });
                }
              }
            } catch (error) {
              reject(new Error("Erro ao processar resposta da API do IBGE"));
            }
          });
        })
        .on("error", (error) => {
          reject(new Error(`Erro ao buscar código IBGE: ${error.message}`));
        });
    });
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
