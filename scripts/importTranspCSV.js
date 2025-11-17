const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const envPath = path.resolve(__dirname, "..", ".env");
require("dotenv").config({ path: envPath });

require("../models");
const {
  Estados,
  Cidades,
  Transportadoras,
  Rotas,
  FaixasPeso,
  PrecosFaixas,
} = require("../models");
const sequelize = require("../config/database.config");

const faixasPesoMap = [
  {
    coluna: "Até 10kg",
    pesoMaximoCSV: 10,
    descricao: "Até 10kg",
  },
  {
    coluna: "Até 20kg",
    pesoMaximoCSV: 20,
    descricao: "Até 20kg",
  },
  {
    coluna: "Até 30kg",
    pesoMaximoCSV: 30,
    descricao: "Até 30kg",
  },
  {
    coluna: " Até 40kg ",
    pesoMaximoCSV: 40,
    descricao: "Até 40kg",
  },
  {
    coluna: " Até 50kg ",
    pesoMaximoCSV: 50,
    descricao: "Até 50kg",
  },
  {
    coluna: " Até 60kg ",
    pesoMaximoCSV: 60,
    descricao: "Até 60kg",
  },
  {
    coluna: " Até 70kg ",
    pesoMaximoCSV: 70,
    descricao: "Até 70kg",
  },
  {
    coluna: "Até 80kg",
    pesoMaximoCSV: 80,
    descricao: "Até 80kg",
  },
  {
    coluna: "Até 90kg",
    pesoMaximoCSV: 90,
    descricao: "Até 90kg",
  },
  {
    coluna: "Até 100kg",
    pesoMaximoCSV: 100,
    descricao: "Até 100kg",
  },
  {
    coluna: "Até 150kg",
    pesoMaximoCSV: 150,
    descricao: "Até 150kg",
  },
];

function encontrarFaixaBanco(pesoMaximoCSV, faixasBanco) {
  const faixasOrdenadas = [...faixasBanco].sort(
    (a, b) => a.peso_maximo - b.peso_maximo
  );

  let faixaEncontrada = null;
  for (const faixa of faixasOrdenadas) {
    if (faixa.peso_maximo <= pesoMaximoCSV) {
      faixaEncontrada = faixa;
    } else {
      break;
    }
  }

  if (!faixaEncontrada && faixasOrdenadas.length > 0) {
    faixaEncontrada = faixasOrdenadas[faixasOrdenadas.length - 1];
  }

  return faixaEncontrada;
}

const normalizarNome = (nome) => {
  return nome
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const converterValor = (valor) => {
  if (!valor || valor.trim() === "") return null;

  const limpo = valor
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = parseFloat(limpo);
  return isNaN(num) ? null : num;
};

const converterPorcentagem = (valor) => {
  if (!valor || valor.trim() === "") return null;

  const limpo = valor.replace(/%/g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? null : num / 100;
};

async function buscarEstado(uf) {
  const ufNormalizada = uf.trim().toUpperCase();
  const estado = await Estados.findOne({ where: { uf: ufNormalizada } });

  if (!estado) {
    throw new Error(`Estado não encontrado: ${ufNormalizada}`);
  }

  return estado;
}

async function buscarCidade(nomeCidade, estadoInicial) {
  const nomeNormalizado = normalizarNome(nomeCidade);

  const buscarEmLista = (listaCidades) => {
    let cidade = listaCidades.find(
      (c) => normalizarNome(c.nome_cidade) === nomeNormalizado
    );

    if (!cidade) {
      cidade = listaCidades.find(
        (c) =>
          normalizarNome(c.nome_cidade).includes(nomeNormalizado) ||
          nomeNormalizado.includes(normalizarNome(c.nome_cidade))
      );
    }

    if (!cidade) {
      const nomeLimpo = nomeNormalizado
        .replace(/DOS|DAS|DO|DA|DE/g, "")
        .replace(/\s+/g, " ")
        .trim();

      cidade = listaCidades.find((c) => {
        const nomeCidadeLimpo = normalizarNome(c.nome_cidade)
          .replace(/DOS|DAS|DO|DA|DE/g, "")
          .replace(/\s+/g, " ")
          .trim();
        return nomeCidadeLimpo === nomeLimpo;
      });
    }

    return cidade;
  };

  const cidadesEstado = await Cidades.findAll({
    where: { id_estado: estadoInicial.id_estado },
  });

  let cidade = buscarEmLista(cidadesEstado);

  if (!cidade) {
    const todasCidades = await Cidades.findAll();
    cidade = buscarEmLista(todasCidades);
  }

  if (!cidade) {
    throw new Error(
      `Cidade não encontrada: ${nomeCidade} - ${estadoInicial.uf}`
    );
  }

  return cidade;
}

const mapeamentoTransportadoras = {
  "DILSON RENATO": "Expresso Show",
  "EXPRESSO PRINCESA": "Princesa dos Campos",
  "PRINCESA DOS CAMPOS": "Princesa dos Campos",
  "SC TRANSPORTES": null,
  TRANSVELLI: null,
  "JA ENCOMENDAS": null,
  "JÁ ENCOMENDAS": null,
  "TOP FLORIPA": null,
};

async function buscarTransportadora(nome) {
  const nomeNormalizado = normalizarNome(nome);

  const nomeMapeado = mapeamentoTransportadoras[nomeNormalizado];
  if (nomeMapeado === null) {
    throw new Error(
      `Transportadora não encontrada: ${nome} (não existe no banco)`
    );
  }
  const nomeParaBuscar = nomeMapeado
    ? normalizarNome(nomeMapeado)
    : nomeNormalizado;

  const transportadoras = await Transportadoras.findAll();

  let transportadora = transportadoras.find(
    (t) => normalizarNome(t.nome_transportadora) === nomeParaBuscar
  );

  if (!transportadora) {
    const nomeLimpo = nomeParaBuscar
      .replace(/TRANSPORTES?/g, "")
      .replace(/LTDA/g, "")
      .replace(/EIRELI/g, "")
      .replace(/EXPRESSO/g, "")
      .replace(/DOS|DAS|DO|DA|DE/g, "")
      .replace(/\s+/g, "")
      .trim();

    transportadora = transportadoras.find((t) => {
      const nomeTransportadoraLimpo = normalizarNome(t.nome_transportadora)
        .replace(/TRANSPORTES?/g, "")
        .replace(/LTDA/g, "")
        .replace(/EIRELI/g, "")
        .replace(/EXPRESSO/g, "")
        .replace(/DOS|DAS|DO|DA|DE/g, "")
        .replace(/\s+/g, "")
        .trim();
      return nomeTransportadoraLimpo === nomeLimpo;
    });
  }

  if (!transportadora) {
    transportadora = transportadoras.find((t) => {
      const nomeT = normalizarNome(t.nome_transportadora);
      if (nomeParaBuscar.length >= 3 && nomeT.length >= 3) {
        return nomeT.includes(nomeParaBuscar) || nomeParaBuscar.includes(nomeT);
      }
      return false;
    });
  }

  if (!transportadora) {
    const palavrasChave = nomeParaBuscar
      .split(/\s+/)
      .filter((p) => p.length >= 3);
    transportadora = transportadoras.find((t) => {
      const nomeT = normalizarNome(t.nome_transportadora);
      return palavrasChave.some((palavra) => nomeT.includes(palavra));
    });
  }

  if (!transportadora) {
    throw new Error(`Transportadora não encontrada: ${nome}`);
  }

  return transportadora;
}

async function buscarRota(cidadeOrigem, cidadeDestino) {
  const rota = await Rotas.findOne({
    where: {
      id_cidade_origem: cidadeOrigem.id_cidade,
      id_cidade_destino: cidadeDestino.id_cidade,
    },
  });

  if (!rota) {
    throw new Error(
      `Rota não encontrada: ${cidadeOrigem.nome_cidade} -> ${cidadeDestino.nome_cidade}`
    );
  }

  return rota;
}

async function buscarTodasFaixasPeso() {
  const faixas = await FaixasPeso.findAll({
    where: { ativa: true },
    order: [["peso_maximo", "ASC"]],
  });
  return faixas;
}

async function importarCSV() {
  try {
    console.log("Iniciando importação do CSV...\n");

    const csvPath = path.join(__dirname, "..", "Transp.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    const records = parse(csvContent, {
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Total de registros no CSV: ${records.length}\n`);

    console.log("Buscando faixas de peso do banco...");
    const faixasBanco = await buscarTodasFaixasPeso();
    console.log(`${faixasBanco.length} faixas de peso encontradas no banco\n`);

    let processados = 0;
    let erros = 0;
    const dataVigencia = new Date();

    for (const record of records) {
      try {
        const transportadoraNome = record.Transportadora?.trim();
        const cidadeOrigemNome = record["CIDADE ORIGEM"]?.trim();
        const cidadeDestinoNome = record["CIDADE DESTINO"]?.trim();
        const uf = record.UF?.trim();

        if (
          !transportadoraNome ||
          !cidadeOrigemNome ||
          !cidadeDestinoNome ||
          !uf
        ) {
          console.log(
            `Linha ignorada (dados incompletos): ${JSON.stringify(record)}`
          );
          erros++;
          continue;
        }

        const estado = await buscarEstado(uf);
        const cidadeOrigem = await buscarCidade(cidadeOrigemNome, estado);
        const cidadeDestino = await buscarCidade(cidadeDestinoNome, estado);
        const transportadora = await buscarTransportadora(transportadoraNome);
        const rota = await buscarRota(cidadeOrigem, cidadeDestino);

        for (const faixaCSV of faixasPesoMap) {
          const valorPreco = converterValor(record[faixaCSV.coluna]);

          if (valorPreco !== null && valorPreco > 0) {
            const faixaBanco = encontrarFaixaBanco(
              faixaCSV.pesoMaximoCSV,
              faixasBanco
            );

            if (!faixaBanco) {
              console.log(
                `Faixa não encontrada para ${faixaCSV.descricao} (peso máximo: ${faixaCSV.pesoMaximoCSV}kg)`
              );
              continue;
            }

            const precoExistente = await PrecosFaixas.findOne({
              where: {
                id_rota: rota.id_rota,
                id_faixa: faixaBanco.id_faixa,
                id_transportadora: transportadora.id_transportadora,
                data_vigencia_inicio: dataVigencia,
              },
            });

            if (!precoExistente) {
              const txEmbarque = converterPorcentagem(record["TX Embarque"]);
              const fretePeso = converterPorcentagem(record["Frete Peso"]);
              const txAdm = converterPorcentagem(record[" TX ADM "]);
              const gris = converterPorcentagem(record["GRIS"]);
              const tde = converterPorcentagem(record[" TDE "]);
              const taxaQuimico = converterPorcentagem(
                record[" TAXA QUIMICO "]
              );

              await PrecosFaixas.create({
                id_rota: rota.id_rota,
                id_faixa: faixaBanco.id_faixa,
                id_transportadora: transportadora.id_transportadora,
                preco: valorPreco,
                tx_embarque: txEmbarque,
                frete_peso: fretePeso,
                tx_adm: txAdm,
                gris: gris,
                tde: tde,
                taxa_quimico: taxaQuimico,
                data_vigencia_inicio: dataVigencia,
                ativo: true,
              });
            }
          }
        }

        processados++;
        if (processados % 100 === 0) {
          console.log(`Processados: ${processados}/${records.length}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar linha:`, error.message);
        erros++;
      }
    }

    console.log("\nImportação concluída!");
    console.log(`Total processado: ${processados}`);
    console.log(`Total de erros: ${erros}`);
  } catch (error) {
    console.error("Erro na importação:", error);
    throw error;
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Conexão com banco de dados estabelecida.\n");

    await importarCSV();

    await sequelize.close();
    console.log("\nConexão fechada.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
})();
