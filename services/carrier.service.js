const axios = require("axios");
require("dotenv").config();

const getCarrier = async () => {
  try {
    const query = `
        SELECT
            OCRD."CardCode",
            COALESCE(OCRD."CardFName",OCRD."CardName") AS "CardName",
            CRD7."TaxId0" as "CNPJ"
        FROM "SBO_COPAPEL_PRD"."OCRD"
        INNER JOIN (
            SELECT
                "CardCode",
                MAX("TaxId0") AS "TaxId0"
            FROM "SBO_COPAPEL_PRD"."CRD7"
            GROUP BY "CardCode"
        ) CRD7
            ON OCRD."CardCode" = CRD7."CardCode"
        INNER JOIN "SBO_COPAPEL_PRD"."OBPL"
            ON CRD7."TaxId0" = OBPL."TaxIdNum"
        WHERE (
            OCRD."GroupCode" = 127
            OR OCRD."CardCode" IN (
                SELECT
                    T10."DflVendor"
                FROM "SBO_COPAPEL_PRD"."OBPL" T10
            )
        )
            AND OCRD."CardType" = 'S'
        ORDER BY OCRD."CardCode" ASC;
      `;

    const url = `${process.env.WS_URL}/consultaSQL?token=${
      process.env.WS_TOKEN
    }&query=${encodeURIComponent(query)}`;

    const response = await axios.get(url);

    return response.data;
  } catch (error) {
    return null;
  }
};

module.exports = { getCarrier };
