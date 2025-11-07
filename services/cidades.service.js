const Cidades = require("../models/cidades.model");
const Estados = require("../models/estados.model");
const Rotas = require("../models/rotas.model");
const PrecosFaixas = require("../models/precosFaixas.model");
const { Op } = require("sequelize");

const getAllCidades = async () => {
  try {
    const cidades = await Cidades.findAll({
      include: [
        {
          model: Estados,
          attributes: ["id_estado", "uf", "nome_estado"],
        },
      ],
      order: [["nome_cidade", "ASC"]],
    });
    return cidades;
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
    // Contar rotas que usam essa cidade como origem ou destino
    const rotasCount = await Rotas.count({
      where: {
        [Op.or]: [{ id_cidade_origem: id }, { id_cidade_destino: id }],
      },
    });

    // Buscar todas as rotas para contar preços
    const rotas = await Rotas.findAll({
      where: {
        [Op.or]: [{ id_cidade_origem: id }, { id_cidade_destino: id }],
      },
      attributes: ["id_rota"],
    });
    const rotaIds = rotas.map((r) => r.id_rota);

    // Contar preços de faixas dessas rotas
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

              // Normalizar nome da cidade para busca
              const normalizarNome = (nome) => {
                return nome
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .trim();
              };

              const nomeNormalizado = normalizarNome(nomeCidade);

              // Buscar município que corresponde ao nome
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
                // Se não encontrou exato, tentar busca mais flexível
                const municipioFlexivel = municipios.find((m) => {
                  const nomeMunicipio = normalizarNome(m.nome);
                  // Remover palavras comuns e comparar
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
