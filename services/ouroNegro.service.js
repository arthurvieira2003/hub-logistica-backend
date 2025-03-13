const axios = require("axios");
require("dotenv").config();

const nfService = require("./nf.service");

const getDadosOuroNegro = async () => {
  try {
    const notas = await nfService.getNotas("ouro negro");

    const resultados = [];

    for (const item of notas) {
      const apiResponse = await axios.get(
        `${process.env.OURO_NEGRO_URL}?nota=${item.Serial}&serie=${item.SeriesStr}&remetente=${item.TaxIdNum}`
      );

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
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = { getDadosOuroNegro };
