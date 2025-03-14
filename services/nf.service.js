const axios = require("axios");
require("dotenv").config();

const getNotas = async (carrier) => {
  try {
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
          "BusinessPlace"."TaxIdNum"
        FROM "SBO_COPAPEL_PRD"."OINV" "Invoice"
          INNER JOIN "SBO_COPAPEL_PRD"."INV12" "InvoiceLines"
            ON "Invoice"."DocEntry" = "InvoiceLines"."DocEntry"
          INNER JOIN "SBO_COPAPEL_PRD"."OCRD" "Customer"
            ON "InvoiceLines"."Carrier" = "Customer"."CardCode"
          INNER JOIN "SBO_COPAPEL_PRD"."OBPL" "BusinessPlace"
            ON "Invoice"."BPLId" = "BusinessPlace"."BPLId"
        WHERE "Customer"."CardName".LOWER() LIKE '%${carrier}%'
          AND "Invoice"."DocDate" >= ADD_DAYS(CURRENT_DATE, -1)
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
    console.log(error);
    return null;
  }
};

module.exports = { getNotas };
