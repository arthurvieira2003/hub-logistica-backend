const axios = require("axios");
const zlib = require("zlib");
const xml2js = require("xml2js");
const { promisify } = require("util");

require("dotenv").config();

const parseString = promisify(xml2js.parseString);

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

    // Filtrar apenas CT-e's verificando o XML
    const ctes = [];

    for (const doc of response.data) {
      try {
        const decodedData = Buffer.from(doc.XmlFile, "base64");
        const decompressedData = zlib.inflateRawSync(decodedData);
        const xmlString = decompressedData.toString("utf-8");

        // Verificar se é um CT-e (não NF-e)
        // CT-e contém "CTe" ou "cteProc" no XML
        // NF-e contém "NFe" ou "nfeProc" no XML
        // Verificação rápida antes de processar completamente
        if (
          xmlString.includes("<CTe") ||
          xmlString.includes("<cteProc") ||
          xmlString.includes('xmlns="http://www.portalfiscal.inf.br/cte') ||
          xmlString.includes('xmlns="http://www.portalfiscal.inf.br/cte"')
        ) {
          // Verificar que NÃO é NF-e
          if (
            xmlString.includes("<NFe") ||
            xmlString.includes("<nfeProc") ||
            xmlString.includes('xmlns="http://www.portalfiscal.inf.br/nfe') ||
            xmlString.includes('xmlns="http://www.portalfiscal.inf.br/nfe"')
          ) {
            continue;
          }

          // É um CT-e, processar
          try {
            const result = await parseString(xmlString);
            doc.xmlData = result;

            // Extrair remetente e destinatário para a listagem
            try {
              let infCte = null;
              if (result?.cteProc?.CTe?.[0]?.infCte?.[0]) {
                infCte = result.cteProc.CTe[0].infCte[0];
              } else if (result?.CTe?.infCte?.[0]) {
                infCte = result.CTe.infCte[0];
              } else if (result?.CTe?.[0]?.infCte?.[0]) {
                infCte = result.CTe[0].infCte[0];
              }

              if (infCte) {
                const rem = infCte.rem?.[0] || {};
                const dest = infCte.dest?.[0] || {};

                doc.remetenteNome = rem.xNome?.[0] || "";
                doc.destinatarioNome = dest.xNome?.[0] || "";
              } else {
                doc.remetenteNome = "";
                doc.destinatarioNome = "";
              }
            } catch (e) {
              // Se houver erro ao extrair, deixar vazio
              doc.remetenteNome = "";
              doc.destinatarioNome = "";
            }
          } catch (err) {
            console.error(
              `❌ [CTE Service] Erro ao converter XML do documento ${doc.Serial}:`,
              err
            );
            doc.remetenteNome = "";
            doc.destinatarioNome = "";
          }

          ctes.push(doc);
        }
      } catch (e) {
        console.error(
          `❌ [CTE Service] Erro ao processar documento ${doc.Serial}:`,
          e.message
        );
        // Continuar com próximo documento
      }
    }

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
            console.error("Erro ao converter XML para JSON:", err);
            reject(new Error(`Erro ao processar XML: ${err.message}`));
            return;
          }

          // A estrutura pode ser cteProc.CTe[0].infCte[0] ou CTe.infCte[0]
          let infCte = null;
          let xmlData = result;

          // Verificar se é uma resposta de erro (resNFe) ou uma NF-e
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

          // Verificar se é uma NF-e ao invés de CT-e
          if (xmlData?.nfeProc || xmlData?.NFe) {
            reject(
              new Error(
                "Este documento é uma NF-e (Nota Fiscal Eletrônica), não um CT-e (Conhecimento de Transporte Eletrônico). Apenas CT-e's podem ser visualizados nesta seção."
              )
            );
            return;
          }

          // Tentar estrutura cteProc (mais comum)
          if (xmlData?.cteProc?.CTe?.[0]?.infCte?.[0]) {
            infCte = xmlData.cteProc.CTe[0].infCte[0];
          }
          // Tentar estrutura direta CTe
          else if (xmlData?.CTe?.infCte?.[0]) {
            infCte = xmlData.CTe.infCte[0];
          }
          // Tentar estrutura com array de CTe
          else if (xmlData?.CTe?.[0]?.infCte?.[0]) {
            infCte = xmlData.CTe[0].infCte[0];
          } else {
            console.error(
              "Estrutura XML não reconhecida:",
              Object.keys(xmlData)
            );
            reject(new Error("Estrutura XML não reconhecida"));
            return;
          }

          const ide = infCte?.ide?.[0] || {};
          const emit = infCte?.emit?.[0] || {};
          const rem = infCte?.rem?.[0] || {};
          const dest = infCte?.dest?.[0] || {};
          const vPrest = infCte?.vPrest?.[0] || {};
          const compl = infCte?.compl?.[0] || {};

          // Extrair informações de transporte
          const exped = infCte?.exped?.[0] || {};
          const receb = infCte?.receb?.[0] || {};

          // Tomador pode estar em toma3 dentro de ide, ou diretamente em infCte
          const toma3 = ide?.toma3?.[0] || {};
          const toma = infCte?.toma3?.[0] || infCte?.toma?.[0] || toma3 || {};

          // Extrair informações de valores
          const imposto = infCte?.imp?.[0] || {};
          const icms = imposto?.ICMS?.[0] || {};
          const icms00 = icms?.ICMS00?.[0] || {};
          const icms45 = icms?.ICMS45?.[0] || {};

          // Extrair componentes da prestação
          const componentesPrestacao = vPrest?.Comp || [];

          // Extrair informações de carga (pode estar em infCTeNorm)
          const infCTeNorm = infCte?.infCTeNorm?.[0] || {};
          const infCarga = infCTeNorm?.infCarga?.[0] || {};
          const infQ = infCarga?.infQ || [];
          const primeiroInfQ = infQ?.[0] || {};

          const cteDetails = {
            // Informações básicas do banco
            serial: cte.Serial,
            cardName: cte.CardName,
            dateAdd: cte.DateAdd,
            docTotal: cte.DocTotal,

            // Informações do CT-e
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

            // Emitente
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

            // Remetente
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

            // Destinatário
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

            // Expedidor
            expedidor: exped?.xNome?.[0]
              ? {
                  cnpj: exped?.CNPJ?.[0] || exped?.CPF?.[0] || "",
                  nome: exped?.xNome?.[0] || "",
                }
              : null,

            // Recebedor
            recebedor: receb?.xNome?.[0]
              ? {
                  cnpj: receb?.CNPJ?.[0] || receb?.CPF?.[0] || "",
                  nome: receb?.xNome?.[0] || "",
                }
              : null,

            // Tomador
            tomador: (() => {
              const tipoTomador = toma?.toma?.[0] || "";
              let cnpjTomador = toma?.CNPJ?.[0] || toma?.CPF?.[0] || "";
              let nomeTomador = toma?.xNome?.[0] || "";

              // Se não tem dados diretos do tomador, buscar baseado no tipo
              if (!cnpjTomador && tipoTomador) {
                if (tipoTomador === "0") {
                  // Remetente
                  cnpjTomador = rem?.CNPJ?.[0] || rem?.CPF?.[0] || "";
                  nomeTomador = rem?.xNome?.[0] || "";
                } else if (tipoTomador === "1") {
                  // Expedidor
                  cnpjTomador = exped?.CNPJ?.[0] || exped?.CPF?.[0] || "";
                  nomeTomador = exped?.xNome?.[0] || "";
                } else if (tipoTomador === "2") {
                  // Recebedor
                  cnpjTomador = receb?.CNPJ?.[0] || receb?.CPF?.[0] || "";
                  nomeTomador = receb?.xNome?.[0] || "";
                } else if (tipoTomador === "3") {
                  // Destinatário
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

            // Valores
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

            // Informações de carga
            carga: {
              quantidade: primeiroInfQ?.qCarga?.[0] || "",
              especie:
                primeiroInfQ?.tpMed?.[0] || primeiroInfQ?.cUnid?.[0] || "",
              valorCarga: infCarga?.vCarga?.[0] || "",
              valorCargaAverb: infCarga?.vCargaAverb?.[0] || "",
              lacres: [],
            },

            // Informações complementares
            informacoesComplementares: compl?.xObs?.[0] || "",

            // XML completo processado
            xmlData: result,
          };

          resolve(cteDetails);
        });
      });
    } catch (e) {
      console.error("Erro ao descompactar os dados com zlib:", e);
      throw new Error(`Erro ao processar XML: ${e.message}`);
    }
  } catch (error) {
    console.error("Erro ao buscar CT-E:", error);
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

  return urls[codigoEstado] || urls["42"]; // SC como fallback
};

module.exports = {
  getCTEs,
  getCTEBySerial,
  getXMLBySerial,
  getPDFByChave,
  getURLConsultaPorEstado,
};
