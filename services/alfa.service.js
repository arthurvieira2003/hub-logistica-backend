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

const getDadosAlfa = async () => {
  const notas = await nfService.getNotas("alfa");

  const resultados = [];

  for (const item of notas) {
    const body = {
      idr: process.env.ALFA_TOKEN,
      merNF: item.Serial,
      cnpjTomador: item.TaxIdNum,
    };

    const apiResponse = await axios.post(process.env.ALFA_URL, body);

    console.log(apiResponse.data);

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
};

module.exports = { getDadosAlfa };
