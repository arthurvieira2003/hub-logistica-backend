const axios = require("axios");
require("dotenv").config();

const nfService = require("./nf.service");
const Tracking = require("../models/tracking.model");

// Função auxiliar para fazer requisição com retry
const fetchWithRetry = async (url, maxRetries = 3, timeout = 10000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Configurar timeout e outras opções
      const response = await axios.get(url, {
        timeout: timeout,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      return response;
    } catch (error) {
      lastError = error;

      // Se não for o último retry, aguarde antes de tentar novamente
      if (attempt < maxRetries - 1) {
        // Espera exponencial entre tentativas (1s, 2s, 4s, etc.)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  throw lastError;
};

// Função para garantir que os valores estejam no tipo correto antes de salvar
const converterTipos = (nota) => {
  return {
    ...nota,
    Serial: parseInt(nota.Serial, 10),
    DocEntry: parseInt(nota.DocEntry, 10),
    DocNum: parseInt(nota.DocNum, 10),
  };
};

// Função para obter dados de rastreamento de uma única nota
const obterDadosRastreamento = async (nota) => {
  try {
    const url = `${process.env.OURO_NEGRO_URL}?nota=${nota.Serial}&serie=${nota.SeriesStr}&remetente=${nota.TaxIdNum}`;

    const apiResponse = await fetchWithRetry(url);

    return {
      docNum: nota.DocNum,
      docEntry: nota.DocEntry,
      cardName: nota.CardName,
      docDate: nota.DocDate,
      serial: nota.Serial,
      seriesStr: nota.SeriesStr,
      carrierName: nota.CarrierName,
      bplName: nota.BPLName,
      cidadeOrigem: nota.CidadeOrigem,
      estadoOrigem: nota.EstadoOrigem,
      cidadeDestino: nota.CidadeDestino,
      estadoDestino: nota.EstadoDestino,
      rastreamento: apiResponse.data,
      status: "success",
    };
  } catch (error) {
    console.error(`Erro ao processar nota ${nota.Serial}: ${error.message}`);

    return {
      docNum: nota.DocNum,
      docEntry: nota.DocEntry,
      cardName: nota.CardName,
      docDate: nota.DocDate,
      serial: nota.Serial,
      seriesStr: nota.SeriesStr,
      carrierName: nota.CarrierName,
      bplName: nota.BPLName,
      cidadeOrigem: nota.CidadeOrigem,
      estadoOrigem: nota.EstadoOrigem,
      cidadeDestino: nota.CidadeDestino,
      estadoDestino: nota.EstadoDestino,
      rastreamento: null,
      status: "error",
      errorMessage: `Não foi possível obter dados de rastreamento: ${error.message}`,
    };
  }
};

// Verifica se um registro de rastreamento precisa ser atualizado
// Por padrão, atualizamos a cada 4 horas
const precisaAtualizar = (tracking, horasParaAtualizar = 4) => {
  if (!tracking || !tracking.lastUpdated) return true;

  const dataAtual = new Date();
  const ultimaAtualizacao = new Date(tracking.lastUpdated);
  const diferencaHoras = (dataAtual - ultimaAtualizacao) / (1000 * 60 * 60);

  return diferencaHoras >= horasParaAtualizar;
};

const getDadosOuroNegro = async (options = {}) => {
  try {
    const {
      forcarAtualizacao = false,
      horasParaAtualizar = 4,
      dias = 1,
      dataInicio = null,
      dataFim = null,
    } = options;

    let notas = await nfService.getNotas(
      "ouro negro",
      dias,
      dataInicio,
      dataFim
    );

    // Converter tipos de dados
    notas = notas.map(converterTipos);

    const resultados = [];

    for (const nota of notas) {
      try {
        // Garantir que serial seja número
        const serialNumero = parseInt(nota.Serial, 10);

        // Buscar no banco de dados primeiro
        let tracking = await Tracking.findOne({
          where: {
            serial: serialNumero,
            seriesStr: nota.SeriesStr,
            taxIdNum: nota.TaxIdNum,
            carrierName: nota.CarrierName,
          },
        });

        // Se não encontrou OU se precisa atualizar OU se está forçando atualização
        if (
          !tracking ||
          precisaAtualizar(tracking, horasParaAtualizar) ||
          forcarAtualizacao
        ) {
          // Buscar dados atualizados da API
          const dadosAtualizados = await obterDadosRastreamento(nota);

          if (tracking) {
            // Atualizar registro existente
            tracking.trackingData = dadosAtualizados.rastreamento;
            tracking.lastUpdated = new Date();
            await tracking.save();
          } else {
            // Criar novo registro
            tracking = await Tracking.create({
              serial: serialNumero,
              seriesStr: nota.SeriesStr,
              taxIdNum: nota.TaxIdNum,
              carrierName: nota.CarrierName,
              docEntry: parseInt(nota.DocEntry, 10),
              docNum: parseInt(nota.DocNum, 10),
              trackingData: dadosAtualizados.rastreamento,
              lastUpdated: new Date(),
            });
          }

          resultados.push({
            ...dadosAtualizados,
            cacheStatus: "updated",
          });
        } else {
          // Usar dados em cache
          resultados.push({
            docNum: nota.DocNum,
            docEntry: nota.DocEntry,
            cardName: nota.CardName,
            docDate: nota.DocDate,
            serial: nota.Serial,
            seriesStr: nota.SeriesStr,
            carrierName: nota.CarrierName,
            bplName: nota.BPLName,
            cidadeOrigem: nota.CidadeOrigem,
            estadoOrigem: nota.EstadoOrigem,
            cidadeDestino: nota.CidadeDestino,
            estadoDestino: nota.EstadoDestino,
            rastreamento: tracking.trackingData,
            status: "success",
            cacheStatus: "cached",
            lastUpdated: tracking.lastUpdated,
          });
        }
      } catch (error) {
        console.error(
          `Erro ao processar nota ${nota.Serial}: ${error.message}`
        );
        resultados.push({
          docNum: nota.DocNum,
          docEntry: nota.DocEntry,
          cardName: nota.CardName,
          docDate: nota.DocDate,
          serial: nota.Serial,
          seriesStr: nota.SeriesStr,
          carrierName: nota.CarrierName,
          bplName: nota.BPLName,
          cidadeOrigem: nota.CidadeOrigem,
          estadoOrigem: nota.EstadoOrigem,
          cidadeDestino: nota.CidadeDestino,
          estadoDestino: nota.EstadoDestino,
          rastreamento: null,
          status: "error",
          errorMessage: `Erro ao processar dados: ${error.message}`,
        });
      }
    }

    if (resultados.length === 1) {
      return resultados[0];
    }

    return resultados;
  } catch (error) {
    return {
      status: "error",
      errorMessage: `Falha ao consultar serviço da Ouro Negro: ${error.message}`,
    };
  }
};

const getDadosOuroNegroPorData = async (options = {}) => {
  try {
    const {
      forcarAtualizacao = false,
      horasParaAtualizar = 4,
      dataEspecifica,
    } = options;

    // Validar se a data foi fornecida
    if (!dataEspecifica) {
      throw new Error("Data específica é obrigatória");
    }

    // Validar formato da data
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(dataEspecifica)) {
      throw new Error("Formato de data inválido. Use o formato YYYY-MM-DD");
    }

    // Buscar notas para a data específica
    let notas = await nfService.getNotas(
      "ouro negro",
      1, // dias não é usado quando dataInicio e dataFim são fornecidos
      dataEspecifica,
      dataEspecifica
    );

    // Verificar se há notas para a data especificada
    if (!notas || notas.length === 0) {
      return {
        status: "success",
        message: `Nenhuma nota encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      };
    }

    // Converter tipos de dados
    notas = notas.map(converterTipos);

    const resultados = [];

    for (const nota of notas) {
      try {
        // Garantir que serial seja número
        const serialNumero = parseInt(nota.Serial, 10);

        // Buscar no banco de dados primeiro
        let tracking = await Tracking.findOne({
          where: {
            serial: serialNumero,
            seriesStr: nota.SeriesStr,
            taxIdNum: nota.TaxIdNum,
            carrierName: nota.CarrierName,
          },
        });

        // Se não encontrou OU se precisa atualizar OU se está forçando atualização
        if (
          !tracking ||
          precisaAtualizar(tracking, horasParaAtualizar) ||
          forcarAtualizacao
        ) {
          // Buscar dados atualizados da API
          const dadosAtualizados = await obterDadosRastreamento(nota);

          if (tracking) {
            // Atualizar registro existente
            tracking.trackingData = dadosAtualizados.rastreamento;
            tracking.lastUpdated = new Date();
            await tracking.save();
          } else {
            // Criar novo registro
            tracking = await Tracking.create({
              serial: serialNumero,
              seriesStr: nota.SeriesStr,
              taxIdNum: nota.TaxIdNum,
              carrierName: nota.CarrierName,
              docEntry: parseInt(nota.DocEntry, 10),
              docNum: parseInt(nota.DocNum, 10),
              trackingData: dadosAtualizados.rastreamento,
              lastUpdated: new Date(),
            });
          }

          resultados.push({
            ...dadosAtualizados,
            cacheStatus: "updated",
          });
        } else {
          // Usar dados em cache
          resultados.push({
            docNum: nota.DocNum,
            docEntry: nota.DocEntry,
            cardName: nota.CardName,
            docDate: nota.DocDate,
            serial: nota.Serial,
            seriesStr: nota.SeriesStr,
            carrierName: nota.CarrierName,
            bplName: nota.BPLName,
            cidadeOrigem: nota.CidadeOrigem,
            estadoOrigem: nota.EstadoOrigem,
            cidadeDestino: nota.CidadeDestino,
            estadoDestino: nota.EstadoDestino,
            rastreamento: tracking.trackingData,
            status: "success",
            cacheStatus: "cached",
            lastUpdated: tracking.lastUpdated,
          });
        }
      } catch (error) {
        console.error(
          `Erro ao processar nota ${nota.Serial}: ${error.message}`
        );
        resultados.push({
          docNum: nota.DocNum,
          docEntry: nota.DocEntry,
          cardName: nota.CardName,
          docDate: nota.DocDate,
          serial: nota.Serial,
          seriesStr: nota.SeriesStr,
          carrierName: nota.CarrierName,
          bplName: nota.BPLName,
          cidadeOrigem: nota.CidadeOrigem,
          estadoOrigem: nota.EstadoOrigem,
          cidadeDestino: nota.CidadeDestino,
          estadoDestino: nota.EstadoDestino,
          rastreamento: null,
          status: "error",
          errorMessage: `Erro ao processar dados: ${error.message}`,
        });
      }
    }

    if (resultados.length === 1) {
      return resultados[0];
    }

    return resultados;
  } catch (error) {
    return {
      status: "error",
      errorMessage: `Falha ao consultar serviço da Ouro Negro: ${error.message}`,
    };
  }
};

module.exports = { getDadosOuroNegro, getDadosOuroNegroPorData };
