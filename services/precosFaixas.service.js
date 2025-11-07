const PrecosFaixas = require("../models/precosFaixas.model");
const Rotas = require("../models/rotas.model");
const FaixasPeso = require("../models/faixasPeso.model");
const Transportadoras = require("../models/transportadoras.model");
const Cidades = require("../models/cidades.model");
const Estados = require("../models/estados.model");

const getAllPrecosFaixas = async () => {
  try {
    const precos = await PrecosFaixas.findAll({
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
      order: [["id_preco", "DESC"]],
    });

    // Buscar cidade destino para cada rota
    const precosCompletos = await Promise.all(
      precos.map(async (preco) => {
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
          precoData.Rota.Cidade = precoData.Rota.CidadeOrigem; // Para compatibilidade
        }
        return precoData;
      })
    );

    return precosCompletos;
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
      precoData.Rota.Cidade = precoData.Rota.CidadeOrigem; // Para compatibilidade
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
    // Desativar em vez de excluir (tem coluna ativo)
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
