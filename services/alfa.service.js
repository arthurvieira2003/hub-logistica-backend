const axios = require("axios");
require("dotenv").config();

const nfService = require("./nf.service");

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

    resultados.push({
      nota: item.nota,
      serie: item.serie,
      remetente: item.remetente,
      responseData: apiResponse.data,
    });
  }

  if (resultados.length === 1) {
    return resultados[0];
  }

  return resultados;
};

module.exports = { getDadosAlfa };
