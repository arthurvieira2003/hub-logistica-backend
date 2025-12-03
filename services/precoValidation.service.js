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

const normalizarPeso = (peso) => {
  let pesoLimpo = String(peso).trim();
  const matchPeso = pesoLimpo.match(/^[\d.,]+/);
  if (matchPeso) {
    pesoLimpo = matchPeso[0].replace(/,/g, ".");
  }
  return parseFloat(pesoLimpo);
};

const validarPeso = (pesoNum) => {
  if (isNaN(pesoNum) || pesoNum <= 0) {
    return { valido: false, erro: "Peso inválido" };
  }
  return { valido: true, erro: null };
};

const FAIXAS_CSV_PEQUENAS = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 44];
const FAIXAS_CSV_COMPLETAS = [
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
];

const filtrarFaixasQueContemPeso = (faixas, pesoNum) => {
  return faixas.filter((f) => {
    const min = parseFloat(f.peso_minimo);
    const max = parseFloat(f.peso_maximo);
    return pesoNum >= min && pesoNum <= max;
  });
};

const encontrarFaixaCSV = (faixas, faixasCSV) => {
  return faixas.find((f) => faixasCSV.includes(f.id_faixa));
};

const ordenarFaixasPorIntervalo = (faixas) => {
  return faixas.sort((a, b) => {
    const intervaloA = parseFloat(a.peso_maximo) - parseFloat(a.peso_minimo);
    const intervaloB = parseFloat(b.peso_maximo) - parseFloat(b.peso_minimo);
    return intervaloA - intervaloB;
  });
};

const obterFaixaDisponivel = (faixasQueContem) => {
  const faixaCSV = encontrarFaixaCSV(faixasQueContem, FAIXAS_CSV_PEQUENAS);
  if (faixaCSV) {
    return { faixa: faixaCSV, erro: null };
  }

  const faixasOrdenadas = ordenarFaixasPorIntervalo(faixasQueContem);
  return { faixa: faixasOrdenadas[0], erro: null };
};

const obterMotivoErroPeso = (pesoNum, faixasDisponiveis) => {
  const maiorFaixa = faixasDisponiveis[faixasDisponiveis.length - 1];
  const menorFaixa = faixasDisponiveis[0];
  const pesoMaximoDisponivel = parseFloat(maiorFaixa.peso_maximo);
  const pesoMinimoDisponivel = parseFloat(menorFaixa.peso_minimo);

  if (pesoNum < pesoMinimoDisponivel) {
    return "Peso abaixo da menor faixa disponível";
  }
  if (pesoNum > pesoMaximoDisponivel) {
    return "Peso acima da maior faixa disponível";
  }
  return "Peso não se encaixa em nenhuma faixa disponível";
};

const processarFaixasDisponiveis = (precosExistentes) => {
  return precosExistentes
    .map((p) => p.FaixasPeso)
    .filter((f) => f !== null && f !== undefined)
    .filter(
      (f, index, self) =>
        index === self.findIndex((faixa) => faixa.id_faixa === f.id_faixa)
    )
    .sort((a, b) => parseFloat(a.peso_maximo) - parseFloat(b.peso_maximo));
};

const buscarFaixasComPreco = async (idRota, idTransportadora) => {
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

  return processarFaixasDisponiveis(precosExistentes);
};

const buscarFaixasNoBanco = async () => {
  return await FaixasPeso.findAll({
    where: { ativa: true },
    order: [["peso_maximo", "ASC"]],
  });
};

const verificarPrecoExiste = async (idRota, idTransportadora, idFaixa) => {
  return await PrecosFaixas.findOne({
    where: {
      id_rota: idRota,
      id_transportadora: idTransportadora,
      id_faixa: idFaixa,
      ativo: true,
    },
  });
};

const encontrarFaixaComRotaETransportadora = async (
  pesoNum,
  idRota,
  idTransportadora
) => {
  const faixasDisponiveis = await buscarFaixasComPreco(
    idRota,
    idTransportadora
  );

  if (faixasDisponiveis.length === 0) {
    return {
      faixa: null,
      erro: "Nenhuma faixa de preço cadastrada",
    };
  }

  const faixasQueContem = filtrarFaixasQueContemPeso(
    faixasDisponiveis,
    pesoNum
  );

  if (faixasQueContem.length > 0) {
    return obterFaixaDisponivel(faixasQueContem);
  }

  const todasFaixasBanco = await buscarFaixasNoBanco();
  const faixasQueContemPesoNoBanco = filtrarFaixasQueContemPeso(
    todasFaixasBanco,
    pesoNum
  );

  if (faixasQueContemPesoNoBanco.length > 0) {
    const faixaCSV = encontrarFaixaCSV(
      faixasQueContemPesoNoBanco,
      FAIXAS_CSV_COMPLETAS
    );
    const faixaEncontrada = faixaCSV || faixasQueContemPesoNoBanco[0];

    const precoExiste = await verificarPrecoExiste(
      idRota,
      idTransportadora,
      faixaEncontrada.id_faixa
    );

    if (!precoExiste) {
      return {
        faixa: faixaEncontrada,
        erro: "Preço não cadastrado para essa faixa de peso",
      };
    }
  }

  const motivo = obterMotivoErroPeso(pesoNum, faixasDisponiveis);
  return { faixa: null, erro: motivo };
};

const encontrarFaixaSemRotaETransportadora = async (pesoNum) => {
  const faixas = await buscarFaixasNoBanco();
  const faixasQueContem = filtrarFaixasQueContemPeso(faixas, pesoNum);

  if (faixasQueContem.length > 0) {
    return obterFaixaDisponivel(faixasQueContem);
  }

  return { faixa: null, erro: "Faixa de peso não encontrada" };
};

const encontrarFaixaPeso = async (
  peso,
  idRota = null,
  idTransportadora = null
) => {
  try {
    const pesoNum = normalizarPeso(peso);
    const validacao = validarPeso(pesoNum);
    if (!validacao.valido) {
      return { faixa: null, erro: validacao.erro };
    }

    if (idRota && idTransportadora) {
      return await encontrarFaixaComRotaETransportadora(
        pesoNum,
        idRota,
        idTransportadora
      );
    }

    return await encontrarFaixaSemRotaETransportadora(pesoNum);
  } catch (error) {
    console.error("Erro ao buscar faixa de peso:", error);
    return { faixa: null, erro: "Erro ao buscar faixa" };
  }
};

const extrairDadosCTE = (cteData) => {
  const { remetente, destinatario, valores, carga, emitente } = cteData;
  return {
    cidadeOrigemNome: remetente?.endereco?.municipio || "",
    cidadeOrigemUF: remetente?.endereco?.uf || "",
    cidadeDestinoNome: destinatario?.endereco?.municipio || "",
    cidadeDestinoUF: destinatario?.endereco?.uf || "",
    transportadoraNome: emitente?.nome || emitente?.fantasia || "",
    peso: carga?.quantidade || "",
    valorCTE: parseFloat(valores?.valorTotal || valores?.valorServico || 0),
    valorMercadoria: parseFloat(carga?.valorCarga || valores?.valorCarga || 0),
  };
};

const criarRespostaErro = (motivo, valorCTE) => {
  return {
    valido: false,
    motivo,
    precoTabela: null,
    precoCTE: valorCTE,
    diferenca: null,
    percentualDiferenca: null,
  };
};

const validarDadosBasicos = (dados) => {
  if (
    !dados.cidadeOrigemNome ||
    !dados.cidadeDestinoNome ||
    !dados.transportadoraNome
  ) {
    return {
      valido: false,
      resposta: criarRespostaErro("Dados insuficientes", dados.valorCTE),
    };
  }
  return { valido: true, resposta: null };
};

const buscarEntidades = async (dados) => {
  const cidadeOrigem = await buscarCidadePorNome(
    dados.cidadeOrigemNome,
    dados.cidadeOrigemUF
  );
  if (!cidadeOrigem) {
    return {
      sucesso: false,
      resposta: criarRespostaErro(
        "Cidade de origem não encontrada",
        dados.valorCTE
      ),
    };
  }

  const cidadeDestino = await buscarCidadePorNome(
    dados.cidadeDestinoNome,
    dados.cidadeDestinoUF
  );
  if (!cidadeDestino) {
    return {
      sucesso: false,
      resposta: criarRespostaErro(
        "Cidade de destino não encontrada",
        dados.valorCTE
      ),
    };
  }

  const transportadora = await buscarTransportadoraPorNome(
    dados.transportadoraNome
  );
  if (!transportadora) {
    return {
      sucesso: false,
      resposta: criarRespostaErro(
        "Transportadora não encontrada",
        dados.valorCTE
      ),
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
      sucesso: false,
      resposta: criarRespostaErro("Rota não encontrada", dados.valorCTE),
    };
  }

  return {
    sucesso: true,
    cidadeOrigem,
    cidadeDestino,
    transportadora,
    rota,
  };
};

const validarFaixaPeso = async (peso, idRota, idTransportadora, valorCTE) => {
  const { faixa: faixaPeso, erro: erroFaixa } = await encontrarFaixaPeso(
    peso,
    idRota,
    idTransportadora
  );

  if (!faixaPeso) {
    return {
      sucesso: false,
      resposta: criarRespostaErro(
        erroFaixa || "Faixa de peso não encontrada",
        valorCTE
      ),
    };
  }

  if (erroFaixa && faixaPeso) {
    return {
      sucesso: false,
      resposta: criarRespostaErro(erroFaixa, valorCTE),
    };
  }

  return { sucesso: true, faixaPeso };
};

const buscarPrecoTabela = async (rota, faixaPeso, transportadora) => {
  const hoje = new Date();
  const dataVigencia = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  return await PrecosFaixas.findOne({
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
};

const calcularPedagio = (precoTabela, valorMercadoria) => {
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

  return pedagio;
};

const calcularFreteValor = (precoTabela, valorMercadoria) => {
  const freteValorRaw = parseFloat(precoTabela.frete_valor || 0);
  const freteValorPercent = freteValorRaw / 100;

  if (freteValorPercent > 0 && valorMercadoria > 0) {
    return valorMercadoria * freteValorPercent;
  }
  return 0;
};

const calcularGris = (precoTabela, valorMercadoria) => {
  const grisRaw = parseFloat(precoTabela.gris || 0);
  const grisPercent = grisRaw / 100;
  const grissMinimo = parseFloat(precoTabela.griss_minimo || 0);

  if (grisPercent > 0 && valorMercadoria > 0) {
    let grisCalculado = valorMercadoria * grisPercent;
    if (grissMinimo > 0 && grisCalculado < grissMinimo) {
      grisCalculado = grissMinimo;
    }
    return grisCalculado;
  }
  return 0;
};

const calcularTDE = (precoTabela, valorMercadoria) => {
  const tdeRaw = parseFloat(precoTabela.tde || 0);
  const tdePercent = tdeRaw / 100;

  if (tdePercent > 0 && valorMercadoria > 0) {
    return valorMercadoria * tdePercent;
  }
  return 0;
};

const calcularTaxaQuimico = (precoTabela, valorMercadoria) => {
  const taxaQuimicoRaw = parseFloat(precoTabela.taxa_quimico || 0);
  const taxaQuimicoPercent = taxaQuimicoRaw / 100;

  if (taxaQuimicoPercent > 0 && valorMercadoria > 0) {
    return valorMercadoria * taxaQuimicoPercent;
  }
  return 0;
};

const calcularValores = (precoTabela, valorMercadoria) => {
  const precoBase = parseFloat(precoTabela.preco || 0);
  const txAdm = parseFloat(precoTabela.tx_adm || 0);
  const pedagio = calcularPedagio(precoTabela, valorMercadoria);
  const freteValorCalculado = calcularFreteValor(precoTabela, valorMercadoria);
  const grisCalculado = calcularGris(precoTabela, valorMercadoria);
  const tdeCalculado = calcularTDE(precoTabela, valorMercadoria);
  const taxaQuimicoCalculado = calcularTaxaQuimico(
    precoTabela,
    valorMercadoria
  );
  const icmsCalculado = 0;

  const valorTotalEsperado =
    precoBase +
    freteValorCalculado +
    grisCalculado +
    txAdm +
    tdeCalculado +
    taxaQuimicoCalculado;

  return {
    precoBase,
    txAdm,
    pedagio,
    freteValorCalculado,
    grisCalculado,
    tdeCalculado,
    taxaQuimicoCalculado,
    icmsCalculado,
    valorTotalEsperado,
  };
};

const determinarStatusEValor = (diferenca, percentualDiferenca) => {
  if (Math.abs(diferenca) <= 0.01) {
    return {
      status: "ok",
      motivo: "Preço está de acordo com a tabela",
    };
  }

  if (diferenca > 0.01) {
    return {
      status: "acima",
      motivo: `Preço cobrado está ${percentualDiferenca.toFixed(
        2
      )}% acima da tabela`,
    };
  }

  return {
    status: "abaixo",
    motivo: `Preço cobrado está ${Math.abs(percentualDiferenca).toFixed(
      2
    )}% abaixo da tabela`,
  };
};

const criarRespostaSucesso = (
  valores,
  valorCTE,
  diferenca,
  percentualDiferenca,
  status,
  motivo,
  cidadeOrigem,
  cidadeDestino,
  transportadora,
  faixaPeso
) => {
  return {
    valido: true,
    status,
    motivo,
    precoTabela: valores.valorTotalEsperado,
    precoBase: valores.precoBase,
    precoCTE: valorCTE,
    diferenca,
    percentualDiferenca,
    detalhesCalculo: {
      precoBase: valores.precoBase,
      freteValor: valores.freteValorCalculado,
      gris: valores.grisCalculado,
      txAdm: valores.txAdm,
      tde: valores.tdeCalculado,
      taxaQuimico: valores.taxaQuimicoCalculado,
      pedagio: valores.pedagio,
      icms: valores.icmsCalculado,
      valorTotal: valores.valorTotalEsperado,
    },
    rota: {
      origem: cidadeOrigem.nome_cidade,
      destino: cidadeDestino.nome_cidade,
    },
    transportadora: transportadora.nome_transportadora,
    faixaPeso: faixaPeso.descricao,
  };
};

const validarPrecoCTE = async (cteData) => {
  try {
    const dados = extrairDadosCTE(cteData);

    const validacaoBasica = validarDadosBasicos(dados);
    if (!validacaoBasica.valido) {
      return validacaoBasica.resposta;
    }

    const entidades = await buscarEntidades(dados);
    if (!entidades.sucesso) {
      return entidades.resposta;
    }

    const validacaoFaixa = await validarFaixaPeso(
      dados.peso,
      entidades.rota.id_rota,
      entidades.transportadora.id_transportadora,
      dados.valorCTE
    );
    if (!validacaoFaixa.sucesso) {
      return validacaoFaixa.resposta;
    }

    const precoTabela = await buscarPrecoTabela(
      entidades.rota,
      validacaoFaixa.faixaPeso,
      entidades.transportadora
    );
    if (!precoTabela) {
      return criarRespostaErro("Preço não encontrado", dados.valorCTE);
    }

    const valores = calcularValores(precoTabela, dados.valorMercadoria);
    const diferenca = dados.valorCTE - valores.valorTotalEsperado;
    const percentualDiferenca =
      valores.valorTotalEsperado > 0
        ? (diferenca / valores.valorTotalEsperado) * 100
        : 0;

    const { status, motivo } = determinarStatusEValor(
      diferenca,
      percentualDiferenca
    );

    return criarRespostaSucesso(
      valores,
      dados.valorCTE,
      diferenca,
      percentualDiferenca,
      status,
      motivo,
      entidades.cidadeOrigem,
      entidades.cidadeDestino,
      entidades.transportadora,
      validacaoFaixa.faixaPeso
    );
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
