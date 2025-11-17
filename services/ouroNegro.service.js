const axios = require("axios");
require("dotenv").config();

const nfService = require("./nf.service");
const Tracking = require("../models/tracking.model");

const fetchWithRetry = async (url, maxRetries = 3, timeout = 10000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

const converterTipos = (nota) => {
  return {
    ...nota,
    Serial: parseInt(nota.Serial, 10),
    DocEntry: parseInt(nota.DocEntry, 10),
    DocNum: parseInt(nota.DocNum, 10),
  };
};

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

    notas = notas.map(converterTipos);

    const resultados = [];

    for (const nota of notas) {
      try {
        const serialNumero = parseInt(nota.Serial, 10);

        let tracking = await Tracking.findOne({
          where: {
            serial: serialNumero,
            seriesStr: nota.SeriesStr,
            taxIdNum: nota.TaxIdNum,
            carrierName: nota.CarrierName,
          },
        });

        if (
          !tracking ||
          precisaAtualizar(tracking, horasParaAtualizar) ||
          forcarAtualizacao
        ) {
          const dadosAtualizados = await obterDadosRastreamento(nota);

          if (tracking) {
            tracking.trackingData = dadosAtualizados.rastreamento;
            tracking.lastUpdated = new Date();
            await tracking.save();
          } else {
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

    if (!dataEspecifica) {
      throw new Error("Data específica é obrigatória");
    }

    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(dataEspecifica)) {
      throw new Error("Formato de data inválido. Use o formato YYYY-MM-DD");
    }

    let notas = await nfService.getNotas(
      "ouro negro",
      1,
      dataEspecifica,
      dataEspecifica
    );

    if (!notas || notas.length === 0) {
      return {
        status: "success",
        message: `Nenhuma nota encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      };
    }

    notas = notas.map(converterTipos);

    const resultados = [];

    for (const nota of notas) {
      try {
        const serialNumero = parseInt(nota.Serial, 10);

        let tracking = await Tracking.findOne({
          where: {
            serial: serialNumero,
            seriesStr: nota.SeriesStr,
            taxIdNum: nota.TaxIdNum,
            carrierName: nota.CarrierName,
          },
        });

        if (
          !tracking ||
          precisaAtualizar(tracking, horasParaAtualizar) ||
          forcarAtualizacao
        ) {
          const dadosAtualizados = await obterDadosRastreamento(nota);

          if (tracking) {
            tracking.trackingData = dadosAtualizados.rastreamento;
            tracking.lastUpdated = new Date();
            await tracking.save();
          } else {
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
