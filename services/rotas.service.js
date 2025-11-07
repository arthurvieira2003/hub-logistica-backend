const Rotas = require("../models/rotas.model");
const Cidades = require("../models/cidades.model");
const Estados = require("../models/estados.model");
const PrecosFaixas = require("../models/precosFaixas.model");

const getAllRotas = async () => {
  try {
    const rotas = await Rotas.findAll({
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
      order: [["id_rota", "ASC"]],
    });
    
    // Buscar cidade destino separadamente para cada rota
    const rotasCompletas = await Promise.all(
      rotas.map(async (rota) => {
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
        rotaData.Cidade = rotaData.CidadeOrigem; // Para compatibilidade
        return rotaData;
      })
    );
    
    return rotasCompletas;
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
    
    // Buscar cidade destino separadamente
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
    rotaData.Cidade = rotaData.CidadeOrigem; // Para compatibilidade
    
    return rotaData;
  } catch (error) {
    console.error("Erro ao buscar rota:", error);
    throw error;
  }
};

const createRota = async (data) => {
  try {
    // Verificar se origem e destino são diferentes
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
    // Verificar se origem e destino são diferentes
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
    // Desativar em vez de excluir (tem coluna ativa)
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
    // Contar preços de faixas ativos dessa rota
    // Nota: Como rota será desativada (não excluída), os preços também serão desativados
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

