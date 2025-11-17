const PrecosFaixas = require("../models/precosFaixas.model");
const Rotas = require("../models/rotas.model");
const Cidades = require("../models/cidades.model");
const Transportadoras = require("../models/transportadoras.model");
const FaixasPeso = require("../models/faixasPeso.model");
const { Op, Sequelize } = require("sequelize");

const normalizarNomeCidade = (nome) => {
  if (!nome) return "";
  return nome
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
};

const buscarCidadePorNome = async (nomeCidade, uf) => {
  try {
    if (!nomeCidade || !uf) return null;

    const nomeNormalizado = normalizarNomeCidade(nomeCidade);
    const Estados = require("../models/estados.model");

    const estado = await Estados.findOne({
      where: { uf: uf.toUpperCase() },
    });

    if (!estado) return null;

    let cidade = await Cidades.findOne({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("nome_cidade")),
            "=",
            nomeCidade.trim().toLowerCase()
          ),
          { id_estado: estado.id_estado },
        ],
      },
    });

    if (cidade) return cidade;

    const todasCidades = await Cidades.findAll({
      where: { id_estado: estado.id_estado },
    });

    cidade = todasCidades.find((c) => {
      const nomeCidadeNormalizado = normalizarNomeCidade(c.nome_cidade);
      return (
        nomeCidadeNormalizado === nomeNormalizado ||
        nomeCidadeNormalizado.includes(nomeNormalizado) ||
        nomeNormalizado.includes(nomeCidadeNormalizado)
      );
    });

    return cidade || null;
  } catch (error) {
    console.error("Erro ao buscar cidade:", error);
    return null;
  }
};

const buscarTransportadoraPorNome = async (nomeTransportadora) => {
  try {
    if (!nomeTransportadora) return null;

    const nomeNormalizado = normalizarNomeCidade(nomeTransportadora);

    const transportadoras = await Transportadoras.findAll({
      where: { ativa: true },
    });

    const normalizarSemPalavrasComuns = (nome) => {
      return nome
        .replace(
          /\b(LTDA|EIRELI|ME|EPP|EIRELI|S\.?A\.?|S\.?S\.?|S\.?C\.?|LTDA\.?)\b/gi,
          ""
        )
        .replace(/\s+/g, " ")
        .trim();
    };

    let transportadora = transportadoras.find((t) => {
      const razaoSocial = normalizarNomeCidade(t.razao_social || "");
      return razaoSocial === nomeNormalizado;
    });

    if (transportadora) return transportadora;

    transportadora = transportadoras.find((t) => {
      const nomeTransp = normalizarNomeCidade(t.nome_transportadora || "");
      return nomeTransp === nomeNormalizado;
    });

    if (transportadora) return transportadora;

    transportadora = transportadoras.find((t) => {
      const razaoSocial = normalizarNomeCidade(t.razao_social || "");
      if (razaoSocial.length < 5) return false;
      return (
        nomeNormalizado.includes(razaoSocial) ||
        (razaoSocial.includes(nomeNormalizado) && nomeNormalizado.length >= 5)
      );
    });

    if (transportadora) return transportadora;

    transportadora = transportadoras.find((t) => {
      const nomeTransp = normalizarNomeCidade(t.nome_transportadora || "");
      if (nomeTransp.length < 5) return false;
      return (
        nomeNormalizado.includes(nomeTransp) ||
        (nomeTransp.includes(nomeNormalizado) && nomeNormalizado.length >= 5)
      );
    });

    if (transportadora) return transportadora;

    const nomeSemComuns = normalizarSemPalavrasComuns(nomeNormalizado);

    if (nomeSemComuns.length >= 5) {
      transportadora = transportadoras.find((t) => {
        const razaoSocial = normalizarSemPalavrasComuns(
          normalizarNomeCidade(t.razao_social || "")
        );
        const nomeTransp = normalizarSemPalavrasComuns(
          normalizarNomeCidade(t.nome_transportadora || "")
        );

        if (razaoSocial === nomeSemComuns || nomeTransp === nomeSemComuns) {
          return true;
        }

        if (razaoSocial.length >= 5) {
          if (
            nomeSemComuns.includes(razaoSocial) ||
            (razaoSocial.includes(nomeSemComuns) && nomeSemComuns.length >= 5)
          ) {
            return true;
          }
        }

        if (nomeTransp.length >= 5) {
          if (
            nomeSemComuns.includes(nomeTransp) ||
            (nomeTransp.includes(nomeSemComuns) && nomeSemComuns.length >= 5)
          ) {
            return true;
          }
        }

        return false;
      });
    }

    return transportadora || null;
  } catch (error) {
    console.error("Erro ao buscar transportadora:", error);
    return null;
  }
};

const encontrarFaixaPeso = async (
  peso,
  idRota = null,
  idTransportadora = null
) => {
  try {
    let pesoLimpo = String(peso).trim();
    const pesoOriginal = pesoLimpo;
    const matchPeso = pesoLimpo.match(/^[\d.,]+/);
    if (matchPeso) {
      pesoLimpo = matchPeso[0].replace(/,/g, ".");
    }

    const pesoNum = parseFloat(pesoLimpo);
    if (isNaN(pesoNum) || pesoNum <= 0) {
      return { faixa: null, erro: "Peso inválido" };
    }

    if (idRota && idTransportadora) {
      const precosExistentes = await PrecosFaixas.findAll({
        where: {
          id_rota: idRota,
          id_transportadora: idTransportadora,
          ativo: true,
        },
        include: [
          {
            model: FaixasPeso,
            where: { ativa: true },
            attributes: ["id_faixa", "descricao", "peso_minimo", "peso_maximo"],
          },
        ],
        attributes: ["id_faixa"],
      });

      const faixasDisponiveis = precosExistentes
        .map((p) => p.FaixasPeso)
        .filter((f) => f !== null && f !== undefined)
        .filter(
          (f, index, self) =>
            index === self.findIndex((faixa) => faixa.id_faixa === f.id_faixa)
        )
        .sort((a, b) => parseFloat(a.peso_maximo) - parseFloat(b.peso_maximo));

      if (faixasDisponiveis.length === 0) {
        return {
          faixa: null,
          erro: "Nenhuma faixa de preço cadastrada",
        };
      }

      const faixasQueContem = faixasDisponiveis.filter((f) => {
        const min = parseFloat(f.peso_minimo);
        const max = parseFloat(f.peso_maximo);
        const contem = pesoNum >= min && pesoNum <= max;
        return contem;
      });

      if (faixasQueContem.length > 0) {
        const faixasCSV = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 44];
        const faixaCSV = faixasQueContem.find((f) =>
          faixasCSV.includes(f.id_faixa)
        );

        if (faixaCSV) {
          return { faixa: faixaCSV, erro: null };
        }

        faixasQueContem.sort((a, b) => {
          const intervaloA =
            parseFloat(a.peso_maximo) - parseFloat(a.peso_minimo);
          const intervaloB =
            parseFloat(b.peso_maximo) - parseFloat(b.peso_minimo);
          return intervaloA - intervaloB;
        });

        return { faixa: faixasQueContem[0], erro: null };
      }

      const todasFaixasBanco = await FaixasPeso.findAll({
        where: { ativa: true },
        order: [["peso_maximo", "ASC"]],
      });

      const faixasQueContemPesoNoBanco = todasFaixasBanco.filter((f) => {
        const min = parseFloat(f.peso_minimo);
        const max = parseFloat(f.peso_maximo);
        return pesoNum >= min && pesoNum <= max;
      });

      if (faixasQueContemPesoNoBanco.length > 0) {
        const faixasCSV = [
          30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
        ];
        const faixaCSV = faixasQueContemPesoNoBanco.find((f) =>
          faixasCSV.includes(f.id_faixa)
        );

        const faixaEncontrada = faixaCSV || faixasQueContemPesoNoBanco[0];

        const precoExiste = await PrecosFaixas.findOne({
          where: {
            id_rota: idRota,
            id_transportadora: idTransportadora,
            id_faixa: faixaEncontrada.id_faixa,
            ativo: true,
          },
        });

        if (!precoExiste) {
          return {
            faixa: faixaEncontrada,
            erro: "Preço não cadastrado para essa faixa de peso",
          };
        }
      }

      const maiorFaixa = faixasDisponiveis[faixasDisponiveis.length - 1];
      const menorFaixa = faixasDisponiveis[0];
      const pesoMaximoDisponivel = parseFloat(maiorFaixa.peso_maximo);
      const pesoMinimoDisponivel = parseFloat(menorFaixa.peso_minimo);

      let motivo = "";
      if (pesoNum < pesoMinimoDisponivel) {
        motivo = "Peso abaixo da menor faixa disponível";
      } else if (pesoNum > pesoMaximoDisponivel) {
        motivo = "Peso acima da maior faixa disponível";
      } else {
        motivo = "Peso não se encaixa em nenhuma faixa disponível";
      }

      return { faixa: null, erro: motivo };
    }

    const faixas = await FaixasPeso.findAll({
      where: { ativa: true },
      order: [["peso_maximo", "ASC"]],
    });

    const faixasQueContem = faixas.filter(
      (f) =>
        pesoNum >= parseFloat(f.peso_minimo) &&
        pesoNum <= parseFloat(f.peso_maximo)
    );

    if (faixasQueContem.length > 0) {
      const faixasCSV = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 44];
      const faixaCSV = faixasQueContem.find((f) =>
        faixasCSV.includes(f.id_faixa)
      );

      if (faixaCSV) {
        return { faixa: faixaCSV, erro: null };
      }

      faixasQueContem.sort((a, b) => {
        const intervaloA =
          parseFloat(a.peso_maximo) - parseFloat(a.peso_minimo);
        const intervaloB =
          parseFloat(b.peso_maximo) - parseFloat(b.peso_minimo);
        return intervaloA - intervaloB;
      });

      return { faixa: faixasQueContem[0], erro: null };
    }

    return { faixa: null, erro: "Faixa de peso não encontrada" };
  } catch (error) {
    console.error("Erro ao buscar faixa de peso:", error);
    return { faixa: null, erro: "Erro ao buscar faixa" };
  }
};

const validarPrecoCTE = async (cteData) => {
  try {
    const { remetente, destinatario, valores, carga, emitente } = cteData;

    const cidadeOrigemNome = remetente?.endereco?.municipio || "";
    const cidadeOrigemUF = remetente?.endereco?.uf || "";
    const cidadeDestinoNome = destinatario?.endereco?.municipio || "";
    const cidadeDestinoUF = destinatario?.endereco?.uf || "";
    const transportadoraNome = emitente?.nome || emitente?.fantasia || "";
    const peso = carga?.quantidade || "";
    const valorCTE = parseFloat(
      valores?.valorTotal || valores?.valorServico || 0
    );

    if (!cidadeOrigemNome || !cidadeDestinoNome || !transportadoraNome) {
      return {
        valido: false,
        motivo: "Dados insuficientes",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    const cidadeOrigem = await buscarCidadePorNome(
      cidadeOrigemNome,
      cidadeOrigemUF
    );
    if (!cidadeOrigem) {
      return {
        valido: false,
        motivo: "Cidade de origem não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    const cidadeDestino = await buscarCidadePorNome(
      cidadeDestinoNome,
      cidadeDestinoUF
    );
    if (!cidadeDestino) {
      return {
        valido: false,
        motivo: "Cidade de destino não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    const transportadora = await buscarTransportadoraPorNome(
      transportadoraNome
    );
    if (!transportadora) {
      return {
        valido: false,
        motivo: "Transportadora não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    const rota = await Rotas.findOne({
      where: {
        id_cidade_origem: cidadeOrigem.id_cidade,
        id_cidade_destino: cidadeDestino.id_cidade,
        ativa: true,
      },
    });

    if (!rota) {
      return {
        valido: false,
        motivo: "Rota não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    const { faixa: faixaPeso, erro: erroFaixa } = await encontrarFaixaPeso(
      peso,
      rota.id_rota,
      transportadora.id_transportadora
    );

    if (!faixaPeso) {
      return {
        valido: false,
        motivo: erroFaixa || "Faixa de peso não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    if (erroFaixa && faixaPeso) {
      return {
        valido: false,
        motivo: erroFaixa,
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    const hoje = new Date();
    const dataVigencia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );

    const precoTabela = await PrecosFaixas.findOne({
      where: {
        id_rota: rota.id_rota,
        id_faixa: faixaPeso.id_faixa,
        id_transportadora: transportadora.id_transportadora,
        data_vigencia_inicio: {
          [Op.lte]: dataVigencia,
        },
        [Op.or]: [
          { data_vigencia_fim: null },
          { data_vigencia_fim: { [Op.gte]: dataVigencia } },
        ],
        ativo: true,
      },
      order: [["data_vigencia_inicio", "DESC"]],
    });

    if (!precoTabela) {
      return {
        valido: false,
        motivo: "Preço não encontrado",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    const precoBase = parseFloat(precoTabela.preco || 0);

    const valorMercadoria = parseFloat(
      carga?.valorCarga || valores?.valorCarga || 0
    );

    const freteValorRaw = parseFloat(precoTabela.frete_valor || 0);
    const freteValorPercent = freteValorRaw / 100;

    const txAdm = parseFloat(precoTabela.tx_adm || 0);

    const grisRaw = parseFloat(precoTabela.gris || 0);
    const grisPercent = grisRaw / 100;

    const grissMinimo = parseFloat(precoTabela.griss_minimo || 0);

    const tdeRaw = parseFloat(precoTabela.tde || 0);
    const tdePercent = tdeRaw / 100;

    const taxaQuimicoRaw = parseFloat(precoTabela.taxa_quimico || 0);
    const taxaQuimicoPercent = taxaQuimicoRaw / 100;

    let pedagio = parseFloat(precoTabela.pedagio || 0);

    if (pedagio === 0) {
      const fracao = parseFloat(precoTabela.fracao || 0);
      const minimo = parseFloat(precoTabela.minimo || 0);
      if (fracao > 0) {
        if (fracao < 1) {
          pedagio = valorMercadoria * (fracao / 100);
        } else {
          pedagio = fracao;
        }
        if (minimo > 0 && pedagio < minimo) {
          pedagio = minimo;
        }
      }
    }

    let freteValorCalculado = 0;
    if (freteValorPercent > 0 && valorMercadoria > 0) {
      freteValorCalculado = valorMercadoria * freteValorPercent;
    }

    let grisCalculado = 0;
    if (grisPercent > 0 && valorMercadoria > 0) {
      grisCalculado = valorMercadoria * grisPercent;
      if (grissMinimo > 0 && grisCalculado < grissMinimo) {
        grisCalculado = grissMinimo;
      }
    }

    let tdeCalculado = 0;
    if (tdePercent > 0 && valorMercadoria > 0) {
      tdeCalculado = valorMercadoria * tdePercent;
    }

    let taxaQuimicoCalculado = 0;
    if (taxaQuimicoPercent > 0 && valorMercadoria > 0) {
      taxaQuimicoCalculado = valorMercadoria * taxaQuimicoPercent;
    }

    let icmsCalculado = 0;
    const valorTotalEsperado =
      precoBase +
      freteValorCalculado +
      grisCalculado +
      txAdm +
      tdeCalculado +
      taxaQuimicoCalculado;

    const diferenca = valorCTE - valorTotalEsperado;
    const percentualDiferenca =
      valorTotalEsperado > 0 ? (diferenca / valorTotalEsperado) * 100 : 0;

    let status = "ok";
    let motivo = "";

    if (Math.abs(diferenca) <= 0.01) {
      status = "ok";
      motivo = "Preço está de acordo com a tabela";
    } else if (diferenca > 0.01) {
      status = "acima";
      motivo = `Preço cobrado está ${percentualDiferenca.toFixed(
        2
      )}% acima da tabela`;
    } else {
      status = "abaixo";
      motivo = `Preço cobrado está ${Math.abs(percentualDiferenca).toFixed(
        2
      )}% abaixo da tabela`;
    }

    return {
      valido: true,
      status,
      motivo,
      precoTabela: valorTotalEsperado,
      precoBase: precoBase,
      precoCTE: valorCTE,
      diferenca,
      percentualDiferenca,
      detalhesCalculo: {
        precoBase,
        freteValor: freteValorCalculado,
        gris: grisCalculado,
        txAdm,
        tde: tdeCalculado,
        taxaQuimico: taxaQuimicoCalculado,
        pedagio,
        icms: icmsCalculado,
        valorTotal: valorTotalEsperado,
      },
      rota: {
        origem: cidadeOrigem.nome_cidade,
        destino: cidadeDestino.nome_cidade,
      },
      transportadora: transportadora.nome_transportadora,
      faixaPeso: faixaPeso.descricao,
    };
  } catch (error) {
    console.error("Erro ao validar preço do CT-e:", error);
    console.error("Stack trace:", error.stack);
    console.error("CT-e data recebido:", JSON.stringify(cteData, null, 2));
    return {
      valido: false,
      motivo: `Erro ao validar: ${error.message}`,
      precoTabela: null,
      precoCTE: parseFloat(
        cteData?.valores?.valorTotal || cteData?.valores?.valorServico || 0
      ),
      diferenca: null,
      percentualDiferenca: null,
    };
  }
};

module.exports = {
  validarPrecoCTE,
};
