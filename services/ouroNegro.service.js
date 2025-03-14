const axios = require("axios");
require("dotenv").config();

const nfService = require("./nf.service");

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
      console.log(`Tentativa ${attempt + 1} falhou: ${error.message}`);
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

const getDadosOuroNegro = async () => {
  try {
    const notas = await nfService.getNotas("ouro negro");

    const resultados = [];

    for (const item of notas) {
      try {
        const url = `${process.env.OURO_NEGRO_URL}?nota=${item.Serial}&serie=${item.SeriesStr}&remetente=${item.TaxIdNum}`;
        console.log(`Fazendo requisição para: ${url}`);

        const apiResponse = await fetchWithRetry(url);

        // Criar objeto de resposta com os dados da nota e os dados da Ouro Negro
        resultados.push({
          docNum: item.DocNum,
          docEntry: item.DocEntry,
          cardName: item.CardName,
          docDate: item.DocDate,
          serial: item.Serial,
          seriesStr: item.SeriesStr,
          carrierName: item.CarrierName,
          bplName: item.BPLName,
          rastreamento: apiResponse.data,
          status: "success",
        });
      } catch (error) {
        console.error(
          `Erro ao processar nota ${item.Serial}: ${error.message}`
        );

        // Adiciona a nota com informação de erro
        resultados.push({
          docNum: item.DocNum,
          docEntry: item.DocEntry,
          cardName: item.CardName,
          docDate: item.DocDate,
          serial: item.Serial,
          seriesStr: item.SeriesStr,
          carrierName: item.CarrierName,
          bplName: item.BPLName,
          rastreamento: null,
          status: "error",
          errorMessage: `Não foi possível obter dados de rastreamento: ${error.message}`,
        });
      }
    }

    if (resultados.length === 1) {
      return resultados[0];
    }

    return resultados;
  } catch (error) {
    console.log(`Erro geral no serviço Ouro Negro: ${error.message}`);
    return {
      status: "error",
      errorMessage: `Falha ao consultar serviço da Ouro Negro: ${error.message}`,
    };
  }
};

module.exports = { getDadosOuroNegro };
