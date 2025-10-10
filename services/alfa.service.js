const axios = require("axios");
require("dotenv").config();
const xml2js = require("xml2js");

const nfService = require("./nf.service");

// Função auxiliar para converter XML para JSON
const xmlToJson = async (xmlData) => {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
    });
    parser.parseString(xmlData, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const getDadosAlfa = async (dataEspecifica) => {
  try {
    // Validar formato da data
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(dataEspecifica)) {
      throw new Error("Formato de data inválido. Use o formato YYYY-MM-DD");
    }

    // Buscar notas para a data específica
    const notas = await nfService.getNotas(
      "alfa",
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

    const resultados = [];

    for (const item of notas) {
      const body = {
        idr: process.env.ALFA_TOKEN,
        merNF: item.Serial,
        cnpjTomador: item.TaxIdNum,
      };

      const apiResponse = await axios.post(process.env.ALFA_URL, body);

      // Converter XML para JSON
      let responseJson = apiResponse.data;

      // Verificar se a resposta é XML
      if (
        typeof apiResponse.data === "string" &&
        apiResponse.data.trim().startsWith("<?xml")
      ) {
        try {
          responseJson = await xmlToJson(apiResponse.data);
        } catch (error) {
          console.error("Erro ao converter XML para JSON:", error);
        }
      }

      // Criar objeto de resposta com os dados da nota e os dados da Alfa
      resultados.push({
        docNum: item.DocNum,
        docEntry: item.DocEntry,
        cardName: item.CardName,
        docDate: item.DocDate,
        serial: item.Serial,
        seriesStr: item.SeriesStr,
        carrierName: item.CarrierName,
        bplName: item.BPLName,
        rastreamento: responseJson,
      });
    }

    if (resultados.length === 1) {
      return resultados[0];
    }

    return resultados;
  } catch (error) {
    console.error(`Erro geral no serviço Alfa: ${error.message}`);
    return {
      status: "error",
      errorMessage: `Falha ao consultar serviço da Alfa: ${error.message}`,
    };
  }
};

module.exports = { getDadosAlfa };
