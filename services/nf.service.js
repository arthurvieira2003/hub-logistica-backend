const axios = require("axios");
require("dotenv").config();

const getNotas = async (
  carrier,
  dias = 1,
  dataInicio = null,
  dataFim = null
) => {
  try {
    let condicaoData = "";

    if (dataInicio && dataFim) {
      const regexData = /^\d{4}-\d{2}-\d{2}$/;

      if (!regexData.test(dataInicio) || !regexData.test(dataFim)) {
        throw new Error("Formato de data inválido. Use o formato YYYY-MM-DD");
      }

      condicaoData = `AND "Invoice"."DocDate" BETWEEN '${dataInicio}' AND '${dataFim}'`;
    } else {
      const diasConsulta = Math.max(1, parseInt(dias, 10) || 1);
      condicaoData = `AND "Invoice"."DocDate" >= ADD_DAYS(CURRENT_DATE, -${diasConsulta})`;
    }

    const query = `
        SELECT
          "Invoice"."DocEntry",
          "Invoice"."DocNum",
          "Invoice"."DocStatus",
          "Invoice"."CardCode",
          "Invoice"."CardName",
          "Invoice"."DocDate",
          "Invoice"."DocTotal",
          "Invoice"."Serial",
          "Invoice"."SeriesStr",
          "InvoiceLines"."Carrier",
          "Customer"."CardName" AS "CarrierName",
          "Invoice"."BPLId",
          "BusinessPlace"."BPLName",
          "BusinessPlace"."TaxIdNum",
          "BusinessPlace"."City" AS "CidadeOrigem",
          "BusinessPlace"."State" AS "EstadoOrigem",
          "CustomerAddress"."City" AS "CidadeDestino",
          "CustomerAddress"."State" AS "EstadoDestino"
        FROM "SBO_COPAPEL_PRD"."OINV" "Invoice"
          INNER JOIN "SBO_COPAPEL_PRD"."INV12" "InvoiceLines"
            ON "Invoice"."DocEntry" = "InvoiceLines"."DocEntry"
          INNER JOIN "SBO_COPAPEL_PRD"."OCRD" "Customer"
            ON "InvoiceLines"."Carrier" = "Customer"."CardCode"
          INNER JOIN "SBO_COPAPEL_PRD"."OBPL" "BusinessPlace"
            ON "Invoice"."BPLId" = "BusinessPlace"."BPLId"
          LEFT JOIN "SBO_COPAPEL_PRD"."CRD1" "CustomerAddress"
            ON "Invoice"."CardCode" = "CustomerAddress"."CardCode"
              AND "Invoice"."ShipToCode" = "CustomerAddress"."Address"
        WHERE "Customer"."CardName".LOWER() LIKE '%${carrier}%'
          ${condicaoData}
        ORDER BY "Invoice"."DocDate" DESC;
      `;

    const url = `${process.env.WS_URL}/consultaSQL?token=${
      process.env.WS_TOKEN
    }&query=${encodeURIComponent(query)}`;

    const response = await axios.get(url);

    const notas = [];

    for (const item of response.data) {
      const cnpjFormatado = item.TaxIdNum.replace(/[^0-9]/g, "");

      const nota = {
        ...item,
        TaxIdNum: cnpjFormatado,
      };

      notas.push(nota);
    }

    return notas;
  } catch (error) {
    return null;
  }
};

module.exports = { getNotas };
