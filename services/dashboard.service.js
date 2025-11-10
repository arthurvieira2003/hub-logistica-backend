const axios = require("axios");
const zlib = require("zlib");
const xml2js = require("xml2js");
const { promisify } = require("util");
const Tracking = require("../models/tracking.model");

require("dotenv").config();

const parseString = promisify(xml2js.parseString);

// Função auxiliar para calcular datas baseadas no período
const getDateRange = (period) => {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  return { startDate, endDate: now };
};

// Função auxiliar para obter período anterior para comparação
const getPreviousPeriod = (period) => {
  const now = new Date();
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "week":
      endDate.setDate(now.getDate() - 7);
      startDate.setDate(now.getDate() - 14);
      break;
    case "month":
      endDate.setMonth(now.getMonth() - 1);
      startDate.setMonth(now.getMonth() - 2);
      break;
    case "year":
      endDate.setFullYear(now.getFullYear() - 1);
      startDate.setFullYear(now.getFullYear() - 2);
      break;
    default:
      endDate.setDate(now.getDate() - 7);
      startDate.setDate(now.getDate() - 14);
  }

  return { startDate, endDate };
};

// Função para obter região do estado
const getRegiao = (uf) => {
  const regioes = {
    Sudeste: ["SP", "RJ", "MG", "ES"],
    Sul: ["RS", "SC", "PR"],
    Nordeste: ["BA", "PE", "CE", "MA", "PB", "PI", "AL", "SE", "RN"],
    "Centro-Oeste": ["GO", "MT", "MS", "DF"],
    Norte: ["AM", "PA", "RO", "AC", "RR", "AP", "TO"],
  };

  for (const [regiao, estados] of Object.entries(regioes)) {
    if (estados.includes(uf)) {
      return regiao;
    }
  }
  return "Outros";
};

// Função para calcular status da entrega baseado no trackingData
const getStatusEntrega = (trackingData) => {
  if (!trackingData || !trackingData.eventos) {
    return "Aguardando Coleta";
  }

  const eventos = trackingData.eventos || [];
  if (eventos.length === 0) {
    return "Aguardando Coleta";
  }

  const ultimoEvento = eventos[eventos.length - 1];
  const status = ultimoEvento.status?.toLowerCase() || "";

  if (status.includes("entregue") || status.includes("entreg")) {
    return "Entregue";
  }
  if (status.includes("atrasado") || status.includes("atraso")) {
    return "Atrasado";
  }
  if (
    status.includes("trânsito") ||
    status.includes("transito") ||
    status.includes("em rota")
  ) {
    return "Em Trânsito";
  }
  return "Aguardando Coleta";
};

// Função principal para obter estatísticas do dashboard
const getDashboardStats = async (period = "week") => {
  try {
    const { startDate, endDate } = getDateRange(period);
    const { startDate: prevStartDate, endDate: prevEndDate } =
      getPreviousPeriod(period);

    // Formatar datas para o formato esperado pelo banco (YYYY-MM-DD HH:MM:SS)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Buscar CT-e's do período atual
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    const query = `SELECT "Serial","CardName","DateAdd","DocTotal","XmlFile" FROM "DBInvOne"."DocReceived" WHERE "DateAdd" >= '${startDateStr}' AND "DateAdd" <= '${endDateStr}' ORDER BY "DateAdd" DESC`;
    const encodedQuery = encodeURIComponent(query);

    const response = await axios.get(process.env.WS_URL, {
      params: {
        token: process.env.WS_TOKEN,
        query: encodedQuery,
      },
    });

    // Buscar CT-e's do período anterior para comparação
    const prevStartDateStr = formatDate(prevStartDate);
    const prevEndDateStr = formatDate(prevEndDate);
    const prevQuery = `SELECT "Serial","CardName","DateAdd","DocTotal","XmlFile" FROM "DBInvOne"."DocReceived" WHERE "DateAdd" >= '${prevStartDateStr}' AND "DateAdd" <= '${prevEndDateStr}' ORDER BY "DateAdd" DESC`;
    const prevEncodedQuery = encodeURIComponent(prevQuery);

    const prevResponse = await axios.get(process.env.WS_URL, {
      params: {
        token: process.env.WS_TOKEN,
        query: prevEncodedQuery,
      },
    });

    // Processar CT-e's do período atual
    const ctes = [];
    const transportadoras = {};
    const regioes = {};
    const statusCount = {
      Entregue: 0,
      Atrasado: 0,
      "Em Trânsito": 0,
      "Aguardando Coleta": 0,
    };
    let totalCusto = 0;
    let entregasNoPrazo = 0;
    let entregasAtrasadas = 0;
    const dailyDeliveries = {};
    const ocorrencias = {
      Atraso: 0,
      Avaria: 0,
      Extravio: 0,
      "Endereço incorreto": 0,
      "Destinatário ausente": 0,
    };
    const desempenhoTransportadoras = {};
    const temposEntrega = []; // Para calcular tempo médio

    // Processar CT-e's do período atual de forma sequencial para evitar sobrecarga
    for (const doc of response.data) {
      try {
        const decodedData = Buffer.from(doc.XmlFile, "base64");
        const decompressedData = zlib.inflateRawSync(decodedData);
        const xmlString = decompressedData.toString("utf-8");

        // Verificar se é CT-e
        if (
          xmlString.includes("<CTe") ||
          xmlString.includes("<cteProc") ||
          xmlString.includes('xmlns="http://www.portalfiscal.inf.br/cte')
        ) {
          if (
            xmlString.includes("<NFe") ||
            xmlString.includes("<nfeProc") ||
            xmlString.includes('xmlns="http://www.portalfiscal.inf.br/nfe')
          ) {
            continue;
          }

          const result = await parseString(xmlString);
          let infCte = null;
          if (result?.cteProc?.CTe?.[0]?.infCte?.[0]) {
            infCte = result.cteProc.CTe[0].infCte[0];
          } else if (result?.CTe?.infCte?.[0]) {
            infCte = result.CTe.infCte[0];
          } else if (result?.CTe?.[0]?.infCte?.[0]) {
            infCte = result.CTe[0].infCte[0];
          }

          if (infCte) {
            const transportadora = doc.CardName || "Desconhecida";
            const dest = infCte.dest?.[0] || {};
            const uf = dest.UF?.[0] || "";
            const regiao = getRegiao(uf);

            // Contar transportadora
            transportadoras[transportadora] =
              (transportadoras[transportadora] || 0) + 1;

            // Contar região
            regioes[regiao] = (regioes[regiao] || 0) + 1;

            // Buscar tracking
            const tracking = await Tracking.findOne({
              where: {
                serial: parseInt(doc.Serial, 10),
              },
            });

            const trackingData = tracking?.trackingData || null;
            const status = getStatusEntrega(trackingData);

            statusCount[status] = (statusCount[status] || 0) + 1;

            // Verificar se está no prazo e calcular tempo de entrega
            if (status === "Entregue" && trackingData?.eventos) {
              const eventos = trackingData.eventos || [];
              const eventoEntrega = eventos.find(
                (e) =>
                  e.status?.toLowerCase().includes("entregue") ||
                  e.status?.toLowerCase().includes("entreg")
              );

              if (eventoEntrega && eventoEntrega.data) {
                const dataEntrega = new Date(eventoEntrega.data);
                const dataEmissaoDate = new Date(doc.DateAdd);
                const diasEntrega = Math.ceil(
                  (dataEntrega - dataEmissaoDate) / (1000 * 60 * 60 * 24)
                );
                temposEntrega.push(diasEntrega);

                if (diasEntrega <= 5) {
                  entregasNoPrazo++;
                } else {
                  entregasAtrasadas++;
                  ocorrencias.Atraso++;
                }
              }
            }

            // Contar entregas diárias
            const date = new Date(doc.DateAdd);
            const dateKey = date.toISOString().split("T")[0];
            dailyDeliveries[dateKey] = (dailyDeliveries[dateKey] || 0) + 1;

            // Calcular custo
            const custo = parseFloat(doc.DocTotal) || 0;
            totalCusto += custo;

            // Inicializar desempenho da transportadora
            if (!desempenhoTransportadoras[transportadora]) {
              desempenhoTransportadoras[transportadora] = {
                nome: transportadora,
                total: 0,
                entregues: 0,
                noPrazo: 0,
                atrasadas: 0,
                temposEntrega: [], // Array para armazenar tempos de entrega
              };
            }

            desempenhoTransportadoras[transportadora].total++;
            if (status === "Entregue") {
              desempenhoTransportadoras[transportadora].entregues++;
              // Verificar se está no prazo (já calculado acima)
              if (trackingData?.eventos) {
                const eventos = trackingData.eventos || [];
                const eventoEntrega = eventos.find(
                  (e) =>
                    e.status?.toLowerCase().includes("entregue") ||
                    e.status?.toLowerCase().includes("entreg")
                );
                if (eventoEntrega && eventoEntrega.data) {
                  const dataEntrega = new Date(eventoEntrega.data);
                  const dataEmissaoDate = new Date(doc.DateAdd);
                  const diasEntrega = Math.ceil(
                    (dataEntrega - dataEmissaoDate) / (1000 * 60 * 60 * 24)
                  );
                  // Armazenar tempo de entrega
                  desempenhoTransportadoras[transportadora].temposEntrega.push(diasEntrega);
                  
                  if (diasEntrega <= 5) {
                    desempenhoTransportadoras[transportadora].noPrazo++;
                  } else {
                    desempenhoTransportadoras[transportadora].atrasadas++;
                  }
                }
              }
            }

            ctes.push({
              serial: doc.Serial,
              transportadora,
              regiao,
              status,
              custo,
              dataEmissao: doc.DateAdd,
            });
          }
        }
      } catch (e) {
        console.error(`Erro ao processar documento ${doc.Serial}:`, e.message);
      }
    }

    // Calcular estatísticas do período anterior (contar apenas documentos, sem processar XMLs)
    // Para performance, vamos contar apenas o número de documentos retornados
    // Em produção, pode ser melhorado com uma query SQL específica
    let prevTotal = 0;
    if (prevResponse.data && Array.isArray(prevResponse.data)) {
      // Contar apenas documentos que parecem ser CT-e's (verificação rápida)
      prevTotal = prevResponse.data.filter((doc) => {
        try {
          const decodedData = Buffer.from(doc.XmlFile, "base64");
          const decompressedData = zlib.inflateRawSync(decodedData);
          const xmlString = decompressedData.toString("utf-8");
          return (
            (xmlString.includes("<CTe") ||
              xmlString.includes("<cteProc") ||
              xmlString.includes(
                'xmlns="http://www.portalfiscal.inf.br/cte'
              )) &&
            !xmlString.includes("<NFe") &&
            !xmlString.includes("<nfeProc") &&
            !xmlString.includes('xmlns="http://www.portalfiscal.inf.br/nfe')
          );
        } catch (e) {
          return false;
        }
      }).length;
    }

    const currentTotal = ctes.length;
    const crescimento =
      prevTotal > 0
        ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
        : currentTotal > 0
        ? 100
        : 0;

    // Calcular taxa de entrega
    const totalEntregas = ctes.length;
    const taxaEntrega =
      totalEntregas > 0
        ? Math.round((entregasNoPrazo / totalEntregas) * 100)
        : 0;

    // Calcular custo médio
    const custoMedio = totalEntregas > 0 ? totalCusto / totalEntregas : 0;

    // Preparar dados de entregas diárias baseado no período
    let dailyDeliveriesArray = [];
    if (period === "week") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        dailyDeliveriesArray.push(dailyDeliveries[dateKey] || 0);
      }
    } else if (period === "month") {
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        dailyDeliveriesArray.push(dailyDeliveries[dateKey] || 0);
      }
    } else {
      // Ano - agrupar por mês
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthTotal = Object.keys(dailyDeliveries)
          .filter((key) => key.startsWith(monthKey))
          .reduce((sum, key) => sum + (dailyDeliveries[key] || 0), 0);
        dailyDeliveriesArray.push(monthTotal);
      }
    }

    // Calcular desempenho das transportadoras
    const desempenhoArray = Object.values(desempenhoTransportadoras)
      .map((desempenho) => {
        const pontualidade =
          desempenho.total > 0
            ? Math.round((desempenho.noPrazo / desempenho.total) * 100)
            : 0;
        
        // Calcular tempo médio de entrega
        const tempoMedioEntrega =
          desempenho.temposEntrega && desempenho.temposEntrega.length > 0
            ? desempenho.temposEntrega.reduce((a, b) => a + b, 0) / desempenho.temposEntrega.length
            : 0;

        return {
          nome: desempenho.nome,
          pontualidade,
          tempoMedioEntrega: Math.round(tempoMedioEntrega * 10) / 10, // Arredondar para 1 casa decimal
          prazoEsperado: 5, // Prazo padrão de 5 dias
          totalEntregas: desempenho.total,
          entreguesNoPrazo: desempenho.noPrazo,
          entreguesAtrasadas: desempenho.atrasadas,
          avarias: 0, // Não temos dados de avarias ainda
          extravio: 0, // Não temos dados de extravio ainda
        };
      })
      // Ordenar por pontualidade (maior primeiro) e depois por tempo médio (menor primeiro)
      .sort((a, b) => {
        if (b.pontualidade !== a.pontualidade) {
          return b.pontualidade - a.pontualidade;
        }
        return a.tempoMedioEntrega - b.tempoMedioEntrega;
      });

    // Calcular SLA das transportadoras
    const slaArray = Object.values(desempenhoTransportadoras).map(
      (desempenho) => {
        const cumprimento =
          desempenho.total > 0
            ? Math.round((desempenho.noPrazo / desempenho.total) * 100)
            : 0;
        return {
          nome: desempenho.nome,
          cumprimento,
        };
      }
    );

    return {
      totalEntregas,
      entregasNoPrazo,
      entregasAtrasadas,
      taxaEntrega,
      crescimento,
      custoTotal: totalCusto,
      custoMedio,
      tempoMedioEntrega:
        temposEntrega.length > 0
          ? temposEntrega.reduce((a, b) => a + b, 0) / temposEntrega.length
          : 0,
      volumeTotal: 0, // Placeholder - precisa extrair do XML
      pesoTotal: 0, // Placeholder - precisa extrair do XML
      transportadoras,
      desempenhoTransportadoras: desempenhoArray,
      regioes,
      statusDistribution: [
        statusCount.Entregue,
        statusCount.Atrasado,
        statusCount["Em Trânsito"],
        statusCount["Aguardando Coleta"],
      ],
      dailyDeliveries: dailyDeliveriesArray,
      ocorrencias: Object.entries(ocorrencias).map(([tipo, quantidade]) => ({
        tipo,
        quantidade,
      })),
      slaTransportadoras: slaArray,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    throw error;
  }
};

module.exports = {
  getDashboardStats,
};
