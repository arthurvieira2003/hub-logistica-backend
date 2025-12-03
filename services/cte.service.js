const axios = require("axios");
const zlib = require("zlib");
const xml2js = require("xml2js");
const { promisify } = require("util");

require("dotenv").config();

const parseString = promisify(xml2js.parseString);

const obterDataFiltro = (dataFiltro) => {
  if (dataFiltro) {
    return dataFiltro;
  }
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const construirQuery = (dataParaFiltro) => {
  const dataInicio = `${dataParaFiltro} 00:00:00`;
  const dataFim = `${dataParaFiltro} 23:59:59`;
  return `SELECT "Serial","CardName","DateAdd","DocTotal","XmlFile" 
    FROM "DBInvOne"."DocReceived" 
    WHERE "DateAdd" >= '${dataInicio}' AND "DateAdd" <= '${dataFim}'
    ORDER BY "DateAdd" DESC 
    LIMIT 100`;
};

const fazerRequisicaoDocumentos = async (query) => {
  const encodedQuery = encodeURIComponent(query);
  return await axios.get(process.env.WS_URL, {
    params: {
      token: process.env.WS_TOKEN,
      query: encodedQuery,
    },
  });
};

const decodificarXML = (xmlFileBase64) => {
  const decodedData = Buffer.from(xmlFileBase64, "base64");
  const decompressedData = zlib.inflateRawSync(decodedData);
  return decompressedData.toString("utf-8");
};

const verificarSeENFe = (xmlString) => {
  const temNFe = xmlString.includes("<NFe") || xmlString.includes("<nfeProc");
  const temNFeNamespace =
    xmlString.includes('xmlns="http://www.portalfiscal.inf.br/nfe') ||
    xmlString.includes('xmlns="http://www.portalfiscal.inf.br/nfe"');
  const temResNFe = xmlString.includes("<resNFe");
  return temNFe || temNFeNamespace || temResNFe;
};

const verificarSeECTe = (xmlString) => {
  const temCTe = xmlString.includes("<CTe") || xmlString.includes("<cteProc");
  const temCTeNamespace =
    xmlString.includes('xmlns="http://www.portalfiscal.inf.br/cte') ||
    xmlString.includes('xmlns="http://www.portalfiscal.inf.br/cte"');
  return temCTe || temCTeNamespace;
};

const extrairInfCte = (result) => {
  if (result?.cteProc?.CTe?.[0]?.infCte?.[0]) {
    return result.cteProc.CTe[0].infCte[0];
  }
  if (result?.CTe?.infCte?.[0]) {
    return result.CTe.infCte[0];
  }
  if (result?.CTe?.[0]?.infCte?.[0]) {
    return result.CTe[0].infCte[0];
  }
  return null;
};

const adicionarInformacoesRemetenteDestinatario = (doc, infCte) => {
  try {
    const rem = infCte.rem?.[0] || {};
    const dest = infCte.dest?.[0] || {};
    doc.remetenteNome = rem.xNome?.[0] || "";
    doc.destinatarioNome = dest.xNome?.[0] || "";
  } catch (e) {
    doc.remetenteNome = "";
    doc.destinatarioNome = "";
  }
};

const processarDocumento = async (doc) => {
  try {
    const xmlString = decodificarXML(doc.XmlFile);

    if (verificarSeENFe(xmlString)) {
      return null;
    }

    if (!verificarSeECTe(xmlString)) {
      return null;
    }

    const result = await parseString(xmlString);

    if (result?.nfeProc || result?.NFe || result?.resNFe) {
      return null;
    }

    const infCte = extrairInfCte(result);
    if (!infCte) {
      return null;
    }

    doc.xmlData = result;
    adicionarInformacoesRemetenteDestinatario(doc, infCte);
    return doc;
  } catch (e) {
    return null;
  }
};

const getCTEs = async (dataFiltro = null) => {
  try {
    const dataParaFiltro = obterDataFiltro(dataFiltro);
    const query = construirQuery(dataParaFiltro);
    const response = await fazerRequisicaoDocumentos(query);

    const ctes = [];
    for (const doc of response.data) {
      const documentoProcessado = await processarDocumento(doc);
      if (documentoProcessado) {
        ctes.push(documentoProcessado);
      }
    }

    return ctes;
  } catch (error) {
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
    throw new Error(`Erro ao buscar PDF: ${error.message}`);
  }
};

const getCTEBySerial = async (serial) => {
  try {
    const query = `SELECT "Serial","CardName","DateAdd","DocTotal","XmlFile" FROM "DBInvOne"."DocReceived" WHERE "Serial" = '${serial}'`;
    const encodedQuery = encodeURIComponent(query);

    const response = await axios.get(process.env.WS_URL, {
      params: {
        token: process.env.WS_TOKEN,
        query: encodedQuery,
      },
    });

    if (!response.data || !response.data[0]) {
      throw new Error("CT-E não encontrado");
    }

    const cte = response.data[0];

    const decodedData = Buffer.from(cte.XmlFile, "base64");

    try {
      const decompressedData = zlib.inflateRawSync(decodedData);
      const xmlString = decompressedData.toString("utf-8");

      return new Promise((resolve, reject) => {
        xml2js.parseString(xmlString, (err, result) => {
          if (err) {
            reject(new Error(`Erro ao processar XML: ${err.message}`));
            return;
          }

          let infCte = null;
          let xmlData = result;

          if (xmlData?.resNFe) {
            const resNFe = xmlData.resNFe[0];
            const motivo =
              resNFe?.xMot?.[0] || "Documento não é um CT-e válido";
            const status = resNFe?.cStat?.[0] || "000";
            reject(
              new Error(
                `Este documento não é um CT-e. É uma NF-e ou documento inválido. Motivo: ${motivo} (Status: ${status})`
              )
            );
            return;
          }

          if (xmlData?.nfeProc || xmlData?.NFe) {
            reject(
              new Error(
                "Este documento é uma NF-e (Nota Fiscal Eletrônica), não um CT-e (Conhecimento de Transporte Eletrônico). Apenas CT-e's podem ser visualizados nesta seção."
              )
            );
            return;
          }

          if (xmlData?.cteProc?.CTe?.[0]?.infCte?.[0]) {
            infCte = xmlData.cteProc.CTe[0].infCte[0];
          } else if (xmlData?.CTe?.infCte?.[0]) {
            infCte = xmlData.CTe.infCte[0];
          } else if (xmlData?.CTe?.[0]?.infCte?.[0]) {
            infCte = xmlData.CTe[0].infCte[0];
          } else {
            reject(new Error("Estrutura XML não reconhecida"));
            return;
          }

          const ide = infCte?.ide?.[0] || {};
          const emit = infCte?.emit?.[0] || {};
          const rem = infCte?.rem?.[0] || {};
          const dest = infCte?.dest?.[0] || {};
          const vPrest = infCte?.vPrest?.[0] || {};
          const compl = infCte?.compl?.[0] || {};

          const exped = infCte?.exped?.[0] || {};
          const receb = infCte?.receb?.[0] || {};

          const toma3 = ide?.toma3?.[0] || {};
          const toma = infCte?.toma3?.[0] || infCte?.toma?.[0] || toma3 || {};

          const imposto = infCte?.imp?.[0] || {};
          const icms = imposto?.ICMS?.[0] || {};
          const icms00 = icms?.ICMS00?.[0] || {};
          const icms45 = icms?.ICMS45?.[0] || {};

          const componentesPrestacao = vPrest?.Comp || [];

          const infCTeNorm = infCte?.infCTeNorm?.[0] || {};
          const infCarga = infCTeNorm?.infCarga?.[0] || {};
          const infQ = infCarga?.infQ || [];
          const primeiroInfQ = infQ?.[0] || {};

          const cteDetails = {
            serial: cte.Serial,
            cardName: cte.CardName,
            dateAdd: cte.DateAdd,
            docTotal: cte.DocTotal,

            numero: ide?.nCT?.[0] || "",
            serie: ide?.serie?.[0] || "",
            chave:
              infCte?.["$"]?.["Id"]?.replace("CTe", "") ||
              infCte?.["$"]?.["Id"] ||
              "",
            dataEmissao: ide?.dhEmi?.[0] || "",
            tipoCTe: ide?.tpCTe?.[0] || "",
            modelo: ide?.mod?.[0] || "",
            tipoEmissao: ide?.tpEmis?.[0] || "",
            ambiente: ide?.tpAmb?.[0] || "",

            emitente: {
              cnpj: emit?.CNPJ?.[0] || "",
              nome: emit?.xNome?.[0] || "",
              fantasia: emit?.xFant?.[0] || "",
              endereco: {
                logradouro: emit?.enderEmit?.[0]?.xLgr?.[0] || "",
                numero: emit?.enderEmit?.[0]?.nro?.[0] || "",
                complemento: emit?.enderEmit?.[0]?.xCpl?.[0] || "",
                bairro: emit?.enderEmit?.[0]?.xBairro?.[0] || "",
                municipio: emit?.enderEmit?.[0]?.xMun?.[0] || "",
                uf: emit?.enderEmit?.[0]?.UF?.[0] || "",
                cep: emit?.enderEmit?.[0]?.CEP?.[0] || "",
              },
              ie: emit?.IE?.[0] || "",
              crt: emit?.CRT?.[0] || "",
            },

            remetente: {
              cnpj: rem?.CNPJ?.[0] || rem?.CPF?.[0] || "",
              nome: rem?.xNome?.[0] || "",
              ie: rem?.IE?.[0] || "",
              endereco: {
                logradouro: rem?.enderReme?.[0]?.xLgr?.[0] || "",
                numero: rem?.enderReme?.[0]?.nro?.[0] || "",
                complemento: rem?.enderReme?.[0]?.xCpl?.[0] || "",
                bairro: rem?.enderReme?.[0]?.xBairro?.[0] || "",
                municipio: rem?.enderReme?.[0]?.xMun?.[0] || "",
                uf: rem?.enderReme?.[0]?.UF?.[0] || "",
                cep: rem?.enderReme?.[0]?.CEP?.[0] || "",
              },
            },

            destinatario: {
              cnpj: dest?.CNPJ?.[0] || dest?.CPF?.[0] || "",
              nome: (dest?.xNome?.[0] || "").replace(/&AMP;/g, "&"),
              ie: dest?.IE?.[0] || "",
              endereco: {
                logradouro: dest?.enderDest?.[0]?.xLgr?.[0] || "",
                numero: dest?.enderDest?.[0]?.nro?.[0] || "",
                complemento: dest?.enderDest?.[0]?.xCpl?.[0] || "",
                bairro: dest?.enderDest?.[0]?.xBairro?.[0] || "",
                municipio: dest?.enderDest?.[0]?.xMun?.[0] || "",
                uf: dest?.enderDest?.[0]?.UF?.[0] || "",
                cep: dest?.enderDest?.[0]?.CEP?.[0] || "",
              },
            },

            expedidor: exped?.xNome?.[0]
              ? {
                  cnpj: exped?.CNPJ?.[0] || exped?.CPF?.[0] || "",
                  nome: exped?.xNome?.[0] || "",
                }
              : null,

            recebedor: receb?.xNome?.[0]
              ? {
                  cnpj: receb?.CNPJ?.[0] || receb?.CPF?.[0] || "",
                  nome: receb?.xNome?.[0] || "",
                }
              : null,

            tomador: (() => {
              const tipoTomador = toma?.toma?.[0] || "";
              let cnpjTomador = toma?.CNPJ?.[0] || toma?.CPF?.[0] || "";
              let nomeTomador = toma?.xNome?.[0] || "";

              if (!cnpjTomador && tipoTomador) {
                if (tipoTomador === "0") {
                  cnpjTomador = rem?.CNPJ?.[0] || rem?.CPF?.[0] || "";
                  nomeTomador = rem?.xNome?.[0] || "";
                } else if (tipoTomador === "1") {
                  cnpjTomador = exped?.CNPJ?.[0] || exped?.CPF?.[0] || "";
                  nomeTomador = exped?.xNome?.[0] || "";
                } else if (tipoTomador === "2") {
                  cnpjTomador = receb?.CNPJ?.[0] || receb?.CPF?.[0] || "";
                  nomeTomador = receb?.xNome?.[0] || "";
                } else if (tipoTomador === "3") {
                  cnpjTomador = dest?.CNPJ?.[0] || dest?.CPF?.[0] || "";
                  nomeTomador = dest?.xNome?.[0] || "";
                }
              }

              return {
                tipo: tipoTomador,
                cnpj: cnpjTomador,
                nome: nomeTomador,
              };
            })(),

            valores: {
              valorServico: vPrest?.vTPrest?.[0] || "",
              valorReceber: vPrest?.vRec?.[0] || "",
              valorTotal: vPrest?.vTPrest?.[0] || "",
              componentes: componentesPrestacao.map((comp) => ({
                nome: comp?.xNome?.[0] || "",
                valor: comp?.vComp?.[0] || "",
              })),
              icms: {
                baseCalculo: icms00?.vBC?.[0] || "",
                aliquota: icms00?.pICMS?.[0] || "",
                valor: icms00?.vICMS?.[0] || "",
                cst: icms45?.CST?.[0] || icms00?.CST?.[0] || "",
              },
            },

            carga: {
              quantidade: primeiroInfQ?.qCarga?.[0] || "",
              especie:
                primeiroInfQ?.tpMed?.[0] || primeiroInfQ?.cUnid?.[0] || "",
              valorCarga: infCarga?.vCarga?.[0] || "",
              valorCargaAverb: infCarga?.vCargaAverb?.[0] || "",
              lacres: [],
            },

            informacoesComplementares: compl?.xObs?.[0] || "",

            xmlData: result,
          };

          resolve(cteDetails);
        });
      });
    } catch (e) {
      throw new Error(`Erro ao processar XML: ${e.message}`);
    }
  } catch (error) {
    throw new Error(`Erro ao buscar CT-E: ${error.message}`);
  }
};

const getURLConsultaPorEstado = (serial) => {
  const codigoEstado = serial.substring(0, 2);

  const urls = {
    42: "https://cte.fazenda.sc.gov.br/dacte.aspx",
    35: "https://nfe.fazenda.sp.gov.br/CTeConsulta/dacte.aspx",
    41: "http://www.fazenda.pr.gov.br/dacte/consulta",
  };

  return urls[codigoEstado] || urls["42"];
};

module.exports = {
  getCTEs,
  getCTEBySerial,
  getXMLBySerial,
  getPDFByChave,
  getURLConsultaPorEstado,
};
