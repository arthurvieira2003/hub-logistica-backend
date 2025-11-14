const PrecosFaixas = require("../models/precosFaixas.model");
const Rotas = require("../models/rotas.model");
const Cidades = require("../models/cidades.model");
const Transportadoras = require("../models/transportadoras.model");
const FaixasPeso = require("../models/faixasPeso.model");
const { Op, Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");

// Função para escrever logs em arquivo
const writeLogToFile = (message, data = null) => {
  try {
    const logDir = path.join(__dirname, "..");
    const logFile = path.join(logDir, "preco-validation.log");
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${
      data ? "\n" + JSON.stringify(data, null, 2) : ""
    }\n\n`;
    fs.appendFileSync(logFile, logEntry, "utf8");
  } catch (error) {
    // Se falhar ao escrever no arquivo, apenas loga no console
    console.error("Erro ao escrever log em arquivo:", error);
  }
};

/**
 * Normaliza nome de cidade para busca (remove acentos, espaços extras, etc)
 */
const normalizarNomeCidade = (nome) => {
  if (!nome) return "";
  return nome
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
};

/**
 * Busca cidade por nome (com busca flexível)
 */
const buscarCidadePorNome = async (nomeCidade, uf) => {
  try {
    if (!nomeCidade || !uf) return null;

    const nomeNormalizado = normalizarNomeCidade(nomeCidade);
    const Estados = require("../models/estados.model");

    // Primeiro buscar o estado
    const estado = await Estados.findOne({
      where: { uf: uf.toUpperCase() },
    });

    if (!estado) return null;

    // Tentar busca exata (case-insensitive usando LOWER no MySQL)
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

    // Se não encontrou, tentar busca normalizada
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

/**
 * Busca transportadora por nome (comparação case-insensitive da razão social)
 */
const buscarTransportadoraPorNome = async (nomeTransportadora) => {
  try {
    if (!nomeTransportadora) return null;

    const nomeNormalizado = normalizarNomeCidade(nomeTransportadora);

    // Buscar todas as transportadoras ativas
    const transportadoras = await Transportadoras.findAll({
      where: { ativa: true },
    });

    // Buscar por match exato (case-insensitive) na razão social
    const transportadora = transportadoras.find((t) => {
      const razaoSocial = normalizarNomeCidade(t.razao_social || "");
      return razaoSocial === nomeNormalizado;
    });

    return transportadora || null;
  } catch (error) {
    console.error("Erro ao buscar transportadora:", error);
    return null;
  }
};

/**
 * Encontra a faixa de peso correspondente ao peso informado
 * IMPORTANTE: Busca apenas faixas que existem na tabela de preços para a rota e transportadora
 * Retorna um objeto com { faixa, erro } onde erro indica o motivo se não encontrou
 */
const encontrarFaixaPeso = async (
  peso,
  idRota = null,
  idTransportadora = null
) => {
  try {
    const pesoNum = parseFloat(peso);
    if (isNaN(pesoNum) || pesoNum <= 0) {
      return { faixa: null, erro: "Peso inválido" };
    }

    // Se temos rota e transportadora, buscar apenas faixas que existem na tabela de preços
    if (idRota && idTransportadora) {
      // Buscar preços ativos para esta rota e transportadora
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

      // Extrair faixas únicas que existem na tabela de preços
      const faixasDisponiveis = precosExistentes
        .map((p) => p.FaixasPeso)
        .filter((f) => f !== null && f !== undefined)
        .filter(
          (f, index, self) =>
            index === self.findIndex((faixa) => faixa.id_faixa === f.id_faixa)
        )
        .sort((a, b) => parseFloat(a.peso_maximo) - parseFloat(b.peso_maximo));

      // Se não há faixas cadastradas para esta rota/transportadora
      if (faixasDisponiveis.length === 0) {
        writeLogToFile(
          `❌ [Validação Preço] Nenhuma faixa de preço cadastrada para esta rota/transportadora`,
          {
            peso,
            idRota,
            idTransportadora,
            motivo:
              "Não há preços cadastrados para esta combinação de rota e transportadora",
          }
        );
        return {
          faixa: null,
          erro: "Nenhuma faixa de preço cadastrada",
        };
      }

      // Encontrar todas as faixas que contêm o peso
      const faixasQueContem = faixasDisponiveis.filter(
        (f) =>
          pesoNum >= parseFloat(f.peso_minimo) &&
          pesoNum <= parseFloat(f.peso_maximo)
      );

      if (faixasQueContem.length > 0) {
        // Se houver múltiplas faixas, priorizar as faixas que correspondem ao mapeamento do CSV
        // Essas são as faixas ID 30-44 (De 0 até 10kg, De 10.01 até 20kg, etc.)
        // que são as faixas de 10 em 10kg usadas no CSV
        const faixasCSV = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 44]; // IDs das faixas do CSV
        const faixaCSV = faixasQueContem.find((f) =>
          faixasCSV.includes(f.id_faixa)
        );

        if (faixaCSV) {
          return { faixa: faixaCSV, erro: null };
        }

        // Se não encontrou faixa do CSV, usar a faixa mais específica (menor intervalo)
        // Ordenar por diferença entre max e min (menor diferença = mais específica)
        faixasQueContem.sort((a, b) => {
          const intervaloA =
            parseFloat(a.peso_maximo) - parseFloat(a.peso_minimo);
          const intervaloB =
            parseFloat(b.peso_maximo) - parseFloat(b.peso_minimo);
          return intervaloA - intervaloB;
        });

        return { faixa: faixasQueContem[0], erro: null };
      }

      // Se não encontrou faixa que cobre o peso, mas há faixas cadastradas
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

      writeLogToFile(
        `❌ [Validação Preço] Peso não se encaixa em nenhuma faixa disponível`,
        {
          peso,
          idRota,
          idTransportadora,
          motivo,
          faixasDisponiveis: faixasDisponiveis.map((f) => ({
            id: f.id_faixa,
            descricao: f.descricao,
            min: f.peso_minimo,
            max: f.peso_maximo,
          })),
        }
      );

      return { faixa: null, erro: motivo };
    }

    // Fallback: Se não temos rota/transportadora, buscar em todas as faixas
    // (caso raro, mas mantido para compatibilidade)
    const faixas = await FaixasPeso.findAll({
      where: { ativa: true },
      order: [["peso_maximo", "ASC"]],
    });

    // Encontrar todas as faixas que contêm o peso
    const faixasQueContem = faixas.filter(
      (f) =>
        pesoNum >= parseFloat(f.peso_minimo) &&
        pesoNum <= parseFloat(f.peso_maximo)
    );

    if (faixasQueContem.length > 0) {
      // Priorizar faixas do CSV (ID 30-44)
      const faixasCSV = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 44];
      const faixaCSV = faixasQueContem.find((f) =>
        faixasCSV.includes(f.id_faixa)
      );

      if (faixaCSV) {
        return { faixa: faixaCSV, erro: null };
      }

      // Se não encontrou, usar a mais específica
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

/**
 * Valida o preço do CT-e comparando com a tabela do banco
 */
const validarPrecoCTE = async (cteData) => {
  try {
    const { remetente, destinatario, valores, carga, emitente } = cteData;

    // Extrair informações necessárias
    const cidadeOrigemNome = remetente?.endereco?.municipio || "";
    const cidadeOrigemUF = remetente?.endereco?.uf || "";
    const cidadeDestinoNome = destinatario?.endereco?.municipio || "";
    const cidadeDestinoUF = destinatario?.endereco?.uf || "";
    const transportadoraNome = emitente?.nome || emitente?.fantasia || "";
    const peso = carga?.quantidade || "";
    const valorCTE = parseFloat(
      valores?.valorTotal || valores?.valorServico || 0
    );

    // Log inicial apenas quando não encontrar (para reduzir logs)
    // Mas sempre logar estrutura do CT-e quando houver problema
    const logInitial = {
      cidadeOrigem: `${cidadeOrigemNome}/${cidadeOrigemUF}`,
      cidadeDestino: `${cidadeDestinoNome}/${cidadeDestinoUF}`,
      transportadora: transportadoraNome,
      peso: peso,
      valorCTE: valorCTE,
      estruturaCTE: {
        remetente: {
          nome: remetente?.nome || "",
          municipio: remetente?.endereco?.municipio || "",
          uf: remetente?.endereco?.uf || "",
        },
        destinatario: {
          nome: destinatario?.nome || "",
          municipio: destinatario?.endereco?.municipio || "",
          uf: destinatario?.endereco?.uf || "",
        },
        emitente: {
          nome: emitente?.nome || "",
          fantasia: emitente?.fantasia || "",
        },
        carga: {
          quantidade: carga?.quantidade || "",
        },
        valores: {
          valorTotal: valores?.valorTotal || "",
          valorServico: valores?.valorServico || "",
        },
      },
    };

    // Validações básicas
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

    // Buscar cidade origem
    const cidadeOrigem = await buscarCidadePorNome(
      cidadeOrigemNome,
      cidadeOrigemUF
    );
    if (!cidadeOrigem) {
      writeLogToFile(
        `❌ [Validação Preço] Cidade origem não encontrada: ${cidadeOrigemNome}/${cidadeOrigemUF}`,
        logInitial
      );
      return {
        valido: false,
        motivo: "Cidade de origem não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    // Buscar cidade destino
    const cidadeDestino = await buscarCidadePorNome(
      cidadeDestinoNome,
      cidadeDestinoUF
    );
    if (!cidadeDestino) {
      writeLogToFile(
        `❌ [Validação Preço] Cidade destino não encontrada: ${cidadeDestinoNome}/${cidadeDestinoUF}`,
        logInitial
      );
      return {
        valido: false,
        motivo: "Cidade de destino não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    // Buscar transportadora
    const transportadora = await buscarTransportadoraPorNome(
      transportadoraNome
    );
    if (!transportadora) {
      // Buscar todas as transportadoras para log de debug
      const todasTransportadoras = await Transportadoras.findAll({
        where: { ativa: true },
        attributes: [
          "id_transportadora",
          "nome_transportadora",
          "razao_social",
        ],
      });

      writeLogToFile(
        `❌ [Validação Preço] Transportadora não encontrada: ${transportadoraNome}`,
        {
          ...logInitial,
          transportadorasDisponiveis: todasTransportadoras.map((t) => ({
            id: t.id_transportadora,
            nome: t.nome_transportadora,
            razao_social: t.razao_social,
          })),
        }
      );
      return {
        valido: false,
        motivo: "Transportadora não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    // Buscar rota
    const rota = await Rotas.findOne({
      where: {
        id_cidade_origem: cidadeOrigem.id_cidade,
        id_cidade_destino: cidadeDestino.id_cidade,
        ativa: true,
      },
    });

    if (!rota) {
      writeLogToFile(
        `❌ [Validação Preço] Rota não encontrada: ${cidadeOrigem.nome_cidade} (ID: ${cidadeOrigem.id_cidade}) → ${cidadeDestino.nome_cidade} (ID: ${cidadeDestino.id_cidade})`,
        logInitial
      );
      return {
        valido: false,
        motivo: "Rota não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    // Buscar faixa de peso (passando rota e transportadora para buscar apenas faixas que existem na tabela)
    const { faixa: faixaPeso, erro: erroFaixa } = await encontrarFaixaPeso(
      peso,
      rota.id_rota,
      transportadora.id_transportadora
    );
    if (!faixaPeso) {
      writeLogToFile(
        `❌ [Validação Preço] Faixa de peso não encontrada: ${
          erroFaixa || "Erro desconhecido"
        }`,
        {
          ...logInitial,
          cidadeOrigem: {
            id: cidadeOrigem.id_cidade,
            nome: cidadeOrigem.nome_cidade,
          },
          cidadeDestino: {
            id: cidadeDestino.id_cidade,
            nome: cidadeDestino.nome_cidade,
          },
          transportadora: {
            id: transportadora.id_transportadora,
            nome: transportadora.nome_transportadora,
          },
          rota: {
            id: rota.id_rota,
          },
          pesoBuscado: peso,
        }
      );
      return {
        valido: false,
        motivo: erroFaixa || "Faixa de peso não encontrada",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    // Buscar preço na tabela
    const hoje = new Date();
    const dataVigencia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );

    const parametrosBusca = {
      id_rota: rota.id_rota,
      id_faixa: faixaPeso.id_faixa,
      id_transportadora: transportadora.id_transportadora,
      dataVigencia: dataVigencia.toISOString().split("T")[0],
    };

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
      // Buscar preços relacionados para debug
      const precosRelacionados = await PrecosFaixas.findAll({
        where: {
          id_rota: rota.id_rota,
          ativo: true,
        },
        include: [
          {
            model: FaixasPeso,
            attributes: ["id_faixa", "descricao", "peso_minimo", "peso_maximo"],
          },
          {
            model: Transportadoras,
            attributes: ["id_transportadora", "nome_transportadora"],
          },
        ],
        limit: 10,
      });

      // Verificar se há preços com a mesma faixa mas transportadora diferente
      const precosMesmaFaixa = await PrecosFaixas.findAll({
        where: {
          id_rota: rota.id_rota,
          id_faixa: faixaPeso.id_faixa,
          ativo: true,
        },
        include: [
          {
            model: Transportadoras,
            attributes: ["id_transportadora", "nome_transportadora"],
          },
        ],
        limit: 5,
      });

      // Verificar se há preços com a mesma transportadora mas faixa diferente
      const precosMesmaTransportadora = await PrecosFaixas.findAll({
        where: {
          id_rota: rota.id_rota,
          id_transportadora: transportadora.id_transportadora,
          ativo: true,
        },
        include: [
          {
            model: FaixasPeso,
            attributes: ["id_faixa", "descricao", "peso_minimo", "peso_maximo"],
          },
        ],
        limit: 5,
      });

      // Buscar preços sem filtro de data para verificar se existe mas está fora da vigência
      const precoSemFiltroData = await PrecosFaixas.findOne({
        where: {
          id_rota: rota.id_rota,
          id_faixa: faixaPeso.id_faixa,
          id_transportadora: transportadora.id_transportadora,
          ativo: true,
        },
        order: [["data_vigencia_inicio", "DESC"]],
      });

      const debugInfo = {
        ...logInitial,
        parametrosBusca,
        cidadeOrigem: {
          id: cidadeOrigem.id_cidade,
          nome: cidadeOrigem.nome_cidade,
        },
        cidadeDestino: {
          id: cidadeDestino.id_cidade,
          nome: cidadeDestino.nome_cidade,
        },
        transportadora: {
          id: transportadora.id_transportadora,
          nome: transportadora.nome_transportadora,
        },
        rota: {
          id: rota.id_rota,
        },
        faixaPeso: {
          id: faixaPeso.id_faixa,
          descricao: faixaPeso.descricao,
          peso_minimo: faixaPeso.peso_minimo,
          peso_maximo: faixaPeso.peso_maximo,
        },
        precosRelacionados: {
          total: precosRelacionados.length,
          precos: precosRelacionados.map((p) => ({
            id_preco: p.id_preco,
            id_faixa: p.id_faixa,
            faixa_descricao: p.FaixasPeso?.descricao,
            id_transportadora: p.id_transportadora,
            transportadora_nome: p.Transportadora?.nome_transportadora,
            preco: p.preco,
            data_vigencia_inicio: p.data_vigencia_inicio,
            data_vigencia_fim: p.data_vigencia_fim,
            ativo: p.ativo,
          })),
        },
        precosMesmaFaixa:
          precosMesmaFaixa.length > 0
            ? {
                transportadoraBuscada: transportadora.nome_transportadora,
                transportadorasEncontradas: precosMesmaFaixa.map((p) => ({
                  transportadora: p.Transportadora?.nome_transportadora,
                  preco: p.preco,
                  data_vigencia_inicio: p.data_vigencia_inicio,
                  data_vigencia_fim: p.data_vigencia_fim,
                })),
              }
            : null,
        precosMesmaTransportadora:
          precosMesmaTransportadora.length > 0
            ? {
                faixaBuscada: faixaPeso.descricao,
                faixasEncontradas: precosMesmaTransportadora.map((p) => ({
                  faixa: p.FaixasPeso?.descricao,
                  peso_min: p.FaixasPeso?.peso_minimo,
                  peso_max: p.FaixasPeso?.peso_maximo,
                  preco: p.preco,
                  data_vigencia_inicio: p.data_vigencia_inicio,
                  data_vigencia_fim: p.data_vigencia_fim,
                })),
              }
            : null,
        precoSemFiltroData: precoSemFiltroData
          ? {
              id_preco: precoSemFiltroData.id_preco,
              preco: precoSemFiltroData.preco,
              data_vigencia_inicio: precoSemFiltroData.data_vigencia_inicio,
              data_vigencia_fim: precoSemFiltroData.data_vigencia_fim,
              motivo: "Preço existe mas está fora da vigência ou inativo",
            }
          : null,
      };

      writeLogToFile(
        `❌ [Validação Preço] Preço não encontrado na tabela para esta combinação`,
        debugInfo
      );

      return {
        valido: false,
        motivo: "Preço não encontrado",
        precoTabela: null,
        precoCTE: valorCTE,
        diferenca: null,
        percentualDiferenca: null,
      };
    }

    // Calcular valor total esperado incluindo todas as taxas
    const precoBase = parseFloat(precoTabela.preco || 0);

    // Extrair valor da mercadoria do CT-e
    const valorMercadoria = parseFloat(
      carga?.valorCarga || valores?.valorCarga || 0
    );

    // Extrair CST do ICMS para verificar se é isento
    const cstICMS = valores?.icms?.cst || "";
    const isICMSIsento =
      cstICMS === "40" || cstICMS === "41" || cstICMS === "50";

    // Extrair taxas do banco de dados
    // IMPORTANTE: No CSV, as porcentagens vêm como "0,20%" que é convertido para 0.2
    // Isso significa que 0.2 = 0.20% = 0.002 em decimal
    // Então precisamos dividir por 100 para obter a porcentagem correta

    // TX Embarque: porcentagem (ex: 0.4 = 0.4% = 0.004)
    const txEmbarqueRaw = parseFloat(precoTabela.tx_embarque || 0);
    const txEmbarque = txEmbarqueRaw / 100; // Converter para decimal (0.4% -> 0.004)

    // Frete Valor: porcentagem (ex: 0.2 = 0.20% = 0.002)
    const freteValorRaw = parseFloat(precoTabela.frete_valor || 0);
    const freteValorPercent = freteValorRaw / 100; // Converter para decimal (0.20% -> 0.002)

    // Frete Peso: porcentagem (ex: 0.48630 = 0.48630% = 0.0048630)
    const fretePesoRaw = parseFloat(precoTabela.frete_peso || 0);
    const fretePesoPercent = fretePesoRaw / 100; // Converter para decimal

    // TX ADM: valor fixo em reais (ex: 4.40)
    const txAdm = parseFloat(precoTabela.tx_adm || 0);

    // GRIS: porcentagem (ex: 0.15 = 0.15% = 0.0015)
    const grisRaw = parseFloat(precoTabela.gris || 0);
    const grisPercent = grisRaw / 100; // Converter para decimal (0.15% -> 0.0015)

    // GRISS Mínimo: valor fixo em reais (ex: 3.64)
    const grissMinimo = parseFloat(precoTabela.griss_minimo || 0);

    // TDE: porcentagem
    const tdeRaw = parseFloat(precoTabela.tde || 0);
    const tdePercent = tdeRaw / 100; // Converter para decimal

    // Taxa Químico: porcentagem
    const taxaQuimicoRaw = parseFloat(precoTabela.taxa_quimico || 0);
    const taxaQuimicoPercent = taxaQuimicoRaw / 100; // Converter para decimal

    // Pedágio: valor fixo em reais (pode ser calculado ou direto)
    // Se não houver pedágio direto, pode ser calculado a partir de FRAÇÃO e MINIMO
    let pedagio = parseFloat(precoTabela.pedagio || 0);

    // Se não houver pedágio direto, tentar calcular a partir de FRAÇÃO
    if (pedagio === 0) {
      const fracao = parseFloat(precoTabela.fracao || 0);
      const minimo = parseFloat(precoTabela.minimo || 0);
      // FRAÇÃO pode ser uma porcentagem (ex: 50% = 0.5) ou um valor fixo
      // Se for < 1, é porcentagem; se for >= 1, é valor fixo
      if (fracao > 0) {
        if (fracao < 1) {
          // É porcentagem, calcular sobre o valor da mercadoria
          pedagio = valorMercadoria * (fracao / 100);
        } else {
          // É valor fixo
          pedagio = fracao;
        }
        // Aplicar mínimo se houver
        if (minimo > 0 && pedagio < minimo) {
          pedagio = minimo;
        }
      }
    }

    // Calcular taxas baseadas no valor da mercadoria
    let freteValorCalculado = 0;
    if (freteValorPercent > 0 && valorMercadoria > 0) {
      freteValorCalculado = valorMercadoria * freteValorPercent;
    }

    let grisCalculado = 0;
    if (grisPercent > 0 && valorMercadoria > 0) {
      grisCalculado = valorMercadoria * grisPercent;
      // Aplicar mínimo se houver
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

    // Calcular ICMS (17% sobre valor da mercadoria no RS, mas apenas se não for isento)
    // NOTA: ICMS geralmente não é incluído no valor do frete, mas sim cobrado separadamente
    // Vamos incluir apenas se necessário, mas por padrão não incluímos
    let icmsCalculado = 0;
    // ICMS não é incluído no cálculo do frete, é uma taxa separada

    // Calcular valor total esperado (sem ICMS e sem pedágio, pois são cobrados separadamente)
    // O pedágio vem do CT-e e não precisa ser validado contra a tabela
    const valorTotalEsperado =
      precoBase +
      freteValorCalculado +
      grisCalculado +
      txAdm +
      tdeCalculado +
      taxaQuimicoCalculado;
    // Não incluir pedagio e icms no cálculo base

    // Log detalhado para debug (sempre logar para entender os cálculos)
    const logCalculo = {
      serial: cteData?.serial || "N/A",
      rota: `${cidadeOrigem.nome_cidade} → ${cidadeDestino.nome_cidade}`,
      transportadora: transportadora.nome_transportadora,
      peso: peso,
      faixaPeso: faixaPeso.descricao,
      precoBase,
      valorMercadoria,
      taxas: {
        freteValor: {
          percentual: `${(freteValorPercent * 100).toFixed(2)}%`,
          raw: freteValorRaw,
          calculado: freteValorCalculado,
        },
        gris: {
          percentual: `${(grisPercent * 100).toFixed(2)}%`,
          raw: grisRaw,
          calculado: grisCalculado,
          minimo: grissMinimo,
          aplicouMinimo: grisCalculado === grissMinimo && grissMinimo > 0,
        },
        txAdm: {
          valor: txAdm,
        },
        tde: {
          percentual: `${(tdePercent * 100).toFixed(2)}%`,
          raw: tdeRaw,
          calculado: tdeCalculado,
        },
        taxaQuimico: {
          percentual: `${(taxaQuimicoPercent * 100).toFixed(2)}%`,
          raw: taxaQuimicoRaw,
          calculado: taxaQuimicoCalculado,
        },
        pedagio: {
          valor: pedagio,
          observacao: "Pedágio não incluído no cálculo base (vem do CT-e)",
        },
        icms: {
          calculado: icmsCalculado,
          cst: cstICMS,
          isento: isICMSIsento,
          ufDestino: cidadeDestinoUF,
          observacao: "ICMS não incluído no cálculo base (taxa separada)",
        },
      },
      valorTotalEsperado,
      valorCTE,
      diferenca: valorCTE - valorTotalEsperado,
      percentualDiferenca:
        valorTotalEsperado > 0
          ? (
              ((valorCTE - valorTotalEsperado) / valorTotalEsperado) *
              100
            ).toFixed(2) + "%"
          : "N/A",
    };

    // Comparar valores
    const diferenca = valorCTE - valorTotalEsperado;
    const percentualDiferenca =
      valorTotalEsperado > 0 ? (diferenca / valorTotalEsperado) * 100 : 0;

    // Determinar status (tolerância de R$ 0,01 para arredondamentos)
    let status = "ok";
    let motivo = "";

    if (Math.abs(diferenca) <= 0.01) {
      // Valores são iguais (ou muito próximos, dentro da tolerância)
      status = "ok";
      motivo = "Preço está de acordo com a tabela";
    } else if (diferenca > 0.01) {
      // Valor do CT-e está acima da tabela
      status = "acima";
      motivo = `Preço cobrado está ${percentualDiferenca.toFixed(
        2
      )}% acima da tabela`;
    } else {
      // Valor do CT-e está abaixo da tabela
      status = "abaixo";
      motivo = `Preço cobrado está ${Math.abs(percentualDiferenca).toFixed(
        2
      )}% abaixo da tabela`;
    }

    return {
      valido: true,
      status,
      motivo,
      precoTabela: valorTotalEsperado, // Retornar valor total esperado, não apenas o preço base
      precoBase: precoBase, // Incluir preço base separadamente
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
