const axios = require("axios");
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const getFrota = async () => {
  try {
    const response = await axios.get(`${process.env.SE_URL}/FrotaHubLog`, {
      headers: {
        Authorization: process.env.SE_SECRET,
      },
      httpsAgent: agent,
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar frota:", error);
    throw error;
  }
};

const getManutencoes = async () => {
  try {
    const response = await axios.get(
      `${process.env.SE_URL}/ManutencoesFrotaHubLog`,
      {
        headers: {
          Authorization: process.env.SE_SECRET,
        },
        httpsAgent: agent,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar manutenções:", error);
    throw error;
  }
};

module.exports = { getFrota, getManutencoes };
