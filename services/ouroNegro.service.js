const axios = require("axios");
require("dotenv").config();

const getDadosOuroNegro = async (data) => {
  try {
    let response = [];
    for (const item of data) {
      const response = await axios.get(
        `${process.env.OURO_NEGRO_URL}?nota=${item.nota}&serie=${item.serie}&remetente=${item.remetente}`
      );
      response.data.push(response.data);
    }
    return {
      ...data.nota,
      response,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = { getDadosOuroNegro };
