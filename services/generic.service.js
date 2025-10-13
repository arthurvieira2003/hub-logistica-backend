const axios = require("axios");
require("dotenv").config();

const nfService = require("./nf.service");
const carrierService = require("./carrier.service");

// Função auxiliar para fazer requisição com retry
const fetchWithRetry = async (url, data, maxRetries = 3, timeout = 10000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(url, data, {
        timeout: timeout,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      return response;
    } catch (error) {
      lastError = error;

      // Se não for o último retry, aguarde antes de tentar novamente
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

// Função para obter dados de rastreamento da SSW
const obterDadosRastreamentoSSW = async (nota) => {
  try {
    const body = {
      cnpj: nota.TaxIdNum,
      nro_nf: nota.Serial.toString(),
    };

    const apiResponse = await fetchWithRetry(
      "https://ssw.inf.br/api/tracking",
      body
    );

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

const getDadosGeneric = async (dataEspecifica) => {
  try {
    // Validar formato da data
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(dataEspecifica)) {
      throw new Error("Formato de data inválido. Use o formato YYYY-MM-DD");
    }

    // Buscar notas para a data específica (excluindo Alfa e Ouro Negro)
    const notas = await nfService.getNotas(
      "", // carrier vazio para buscar todas
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

    // Buscar transportadoras internas (Copapel e afiliadas)
    const transportadorasInternas = await carrierService.getCarrier();
    const codigosInternos = transportadorasInternas
      ? transportadorasInternas.map((t) => t.CardCode)
      : [];

    // Filtrar apenas notas que tenham transportadora externa
    const notasFiltradas = notas.filter((nota) => {
      const carrier = nota.Carrier;

      // Verificar se o campo carrier não está vazio ou nulo
      if (!carrier || carrier.trim() === "") {
        return false;
      }

      // Verificar se não é uma transportadora interna (Copapel)
      if (codigosInternos.includes(carrier)) {
        return false;
      }

      // Verificar se não é Alfa nem Ouro Negro
      const carrierName = nota.CarrierName?.toLowerCase() || "";
      if (
        carrierName.includes("alfa") ||
        carrierName.includes("ouro negro") ||
        carrierName.includes("transportes ouro negro")
      ) {
        return false;
      }

      return true;
    });

    if (notasFiltradas.length === 0) {
      return {
        status: "success",
        message: `Nenhuma nota de outras transportadoras encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      };
    }

    const resultados = [];

    for (const nota of notasFiltradas) {
      try {
        const dadosAtualizados = await obterDadosRastreamentoSSW(nota);
        resultados.push(dadosAtualizados);
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

    // Verificar se após processar todas as notas, não restou nenhuma
    if (resultados.length === 0) {
      return {
        status: "success",
        message: `Nenhuma nota de transportadora externa encontrada para a data ${dataEspecifica}`,
        data: [],
        total: 0,
      };
    }

    if (resultados.length === 1) {
      return resultados[0];
    }

    return resultados;
  } catch (error) {
    console.error(`Erro geral no serviço genérico: ${error.message}`);
    return {
      status: "error",
      errorMessage: `Falha ao consultar serviço genérico: ${error.message}`,
    };
  }
};

module.exports = { getDadosGeneric };
