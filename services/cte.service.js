const axios = require("axios");
const zlib = require("zlib");
const xml2js = require("xml2js");

require("dotenv").config();

const getCTEs = async () => {
  try {
    const query =
      'SELECT "Serial","CardName","DateAdd","DocTotal","XmlFile" FROM "DBInvOne"."DocReceived" ORDER BY "DateAdd" DESC LIMIT 100';
    const encodedQuery = encodeURIComponent(query);

    const response = await axios.get(process.env.WS_URL, {
      params: {
        token: process.env.WS_TOKEN,
        query: encodedQuery,
      },
    });

    const ctes = response.data.map((cte) => {
      const decodedData = Buffer.from(cte.XmlFile, "base64");
      try {
        const decompressedData = zlib.inflateRawSync(decodedData);
        const xmlString = decompressedData.toString("utf-8");

        xml2js.parseString(xmlString, (err, result) => {
          if (err) {
            console.error("Erro ao converter XML para JSON:", err);
          } else {
            cte.xmlData = result;
          }
        });
      } catch (e) {
        console.error("Erro ao descompactar os dados com zlib:", e);
      }
      return cte;
    });

    return ctes;
  } catch (error) {
    console.error("Erro ao buscar CTEs:", error);
    throw error;
  }
};

const getXMLBySerial = async (serial) => {
  try {
    const query = `SELECT "XmlFile" FROM "DBInvOne"."DocReceived" WHERE "Serial" = '${serial}'`;
    const encodedQuery = encodeURIComponent(query);

    const response = await axios.get(process.env.WS_URL, {
      params: {
        token: process.env.WS_TOKEN,
        query: encodedQuery,
      },
    });

    if (!response.data || !response.data[0] || !response.data[0].XmlFile) {
      throw new Error("XML não encontrado");
    }

    const decodedData = Buffer.from(response.data[0].XmlFile, "base64");
    const decompressedData = zlib.inflateRawSync(decodedData);
    return decompressedData;
  } catch (error) {
    throw new Error(`Erro ao buscar XML: ${error.message}`);
  }
};

const getPDFByChave = async (serial) => {
  try {
    const baseUrl = getURLConsultaPorEstado(serial);
    const url = `${baseUrl}?chCTe=${serial}`;

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "arraybuffer",
      headers: {
        Accept: "application/pdf",
      },
    });

    if (response.headers["content-type"] !== "application/pdf") {
      throw new Error("Resposta não é um PDF válido");
    }

    return response.data;
  } catch (error) {
    console.error("Erro ao buscar PDF:", error);
    throw new Error(`Erro ao buscar PDF: ${error.message}`);
  }
};

const getURLConsultaPorEstado = (serial) => {
  const codigoEstado = serial.substring(0, 2);

  const urls = {
    42: "https://cte.fazenda.sc.gov.br/dacte.aspx",
    35: "https://nfe.fazenda.sp.gov.br/CTeConsulta/dacte.aspx",
    41: "http://www.fazenda.pr.gov.br/dacte/consulta",
  };

  return urls[codigoEstado] || urls["42"]; // SC como fallback
};

module.exports = {
  getCTEs,
  getXMLBySerial,
  getPDFByChave,
  getURLConsultaPorEstado,
};
