const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

// Carregar .env do diretório raiz do projeto
const envPath = path.resolve(__dirname, "..", ".env");
require("dotenv").config({ path: envPath });

// Importar modelos
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

// Mapeamento das faixas de peso do CSV para as faixas do banco
// O CSV tem "Até Xkg" mas o banco tem faixas de 5kg em 5kg
// Vamos mapear o valor do CSV para a faixa mais próxima do banco
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

// Função para encontrar a faixa do banco que corresponde ao peso máximo do CSV
// Ex: "Até 10kg" do CSV -> busca faixa do banco que tenha peso_maximo <= 10 e seja a mais próxima
function encontrarFaixaBanco(pesoMaximoCSV, faixasBanco) {
  // Ordenar faixas por peso_maximo
  const faixasOrdenadas = [...faixasBanco].sort(
    (a, b) => a.peso_maximo - b.peso_maximo
  );

  // Encontrar a faixa mais próxima que seja <= pesoMaximoCSV
  let faixaEncontrada = null;
  for (const faixa of faixasOrdenadas) {
    if (faixa.peso_maximo <= pesoMaximoCSV) {
      faixaEncontrada = faixa;
    } else {
      break;
    }
  }

  // Se não encontrou, usar a maior faixa disponível
  if (!faixaEncontrada && faixasOrdenadas.length > 0) {
    faixaEncontrada = faixasOrdenadas[faixasOrdenadas.length - 1];
  }

  return faixaEncontrada;
}

// Função para normalizar nome (remover acentos, espaços extras, etc)
const normalizarNome = (nome) => {
  return nome
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Função para converter valor monetário do CSV para número
const converterValor = (valor) => {
  if (!valor || valor.trim() === "") return null;

  // Remove R$, espaços e converte vírgula para ponto
  const limpo = valor
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = parseFloat(limpo);
  return isNaN(num) ? null : num;
};

// Função para converter porcentagem
const converterPorcentagem = (valor) => {
  if (!valor || valor.trim() === "") return null;

  const limpo = valor.replace(/%/g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? null : num / 100; // Converte para decimal (0.15 = 15%)
};

// Função para buscar estado (não cria, apenas busca)
async function buscarEstado(uf) {
  const ufNormalizada = uf.trim().toUpperCase();
  const estado = await Estados.findOne({ where: { uf: ufNormalizada } });

  if (!estado) {
    throw new Error(`Estado não encontrado: ${ufNormalizada}`);
  }

  return estado;
}

// Função para buscar cidade (não cria, apenas busca com busca flexível)
// Tenta buscar em todos os estados se não encontrar no estado especificado
async function buscarCidade(nomeCidade, estadoInicial) {
  const nomeNormalizado = normalizarNome(nomeCidade);

  // Função auxiliar para buscar cidade em uma lista
  const buscarEmLista = (listaCidades) => {
    // Tentar match exato primeiro
    let cidade = listaCidades.find(
      (c) => normalizarNome(c.nome_cidade) === nomeNormalizado
    );

    // Se não encontrou, tentar busca parcial (contém)
    if (!cidade) {
      cidade = listaCidades.find(
        (c) =>
          normalizarNome(c.nome_cidade).includes(nomeNormalizado) ||
          nomeNormalizado.includes(normalizarNome(c.nome_cidade))
      );
    }

    // Se ainda não encontrou, tentar remover palavras comuns e buscar novamente
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

  // Primeiro, tentar no estado especificado
  const cidadesEstado = await Cidades.findAll({
    where: { id_estado: estadoInicial.id_estado },
  });

  let cidade = buscarEmLista(cidadesEstado);

  // Se não encontrou no estado inicial, buscar em TODOS os estados
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

// Mapeamento de nomes do CSV para nomes no banco
const mapeamentoTransportadoras = {
  "DILSON RENATO": "Expresso Show",
  "EXPRESSO PRINCESA": "Princesa dos Campos",
  "PRINCESA DOS CAMPOS": "Princesa dos Campos",
  "SC TRANSPORTES": null, // Não existe no banco
  TRANSVELLI: null, // Não existe no banco
  "JA ENCOMENDAS": null, // Não existe no banco
  "JÁ ENCOMENDAS": null, // Não existe no banco
  "TOP FLORIPA": null, // Não existe no banco
};

// Função para buscar transportadora (não cria, apenas busca com busca flexível)
async function buscarTransportadora(nome) {
  const nomeNormalizado = normalizarNome(nome);

  // Verificar mapeamento primeiro
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

  // Tentar match exato primeiro
  let transportadora = transportadoras.find(
    (t) => normalizarNome(t.nome_transportadora) === nomeParaBuscar
  );

  // Se não encontrou, tentar busca parcial
  if (!transportadora) {
    // Remover palavras comuns como "TRANSPORTES", "TRANSPORTE", "LTDA", etc.
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

  // Se ainda não encontrou, tentar busca que contém (mas sem remover palavras)
  if (!transportadora) {
    transportadora = transportadoras.find((t) => {
      const nomeT = normalizarNome(t.nome_transportadora);
      // Verificar se um contém o outro (mas com pelo menos 3 caracteres)
      if (nomeParaBuscar.length >= 3 && nomeT.length >= 3) {
        return nomeT.includes(nomeParaBuscar) || nomeParaBuscar.includes(nomeT);
      }
      return false;
    });
  }

  // Se ainda não encontrou, tentar busca por palavras-chave
  if (!transportadora) {
    const palavrasChave = nomeParaBuscar
      .split(/\s+/)
      .filter((p) => p.length >= 3);
    transportadora = transportadoras.find((t) => {
      const nomeT = normalizarNome(t.nome_transportadora);
      // Verificar se pelo menos uma palavra-chave está no nome
      return palavrasChave.some((palavra) => nomeT.includes(palavra));
    });
  }

  if (!transportadora) {
    throw new Error(`Transportadora não encontrada: ${nome}`);
  }

  return transportadora;
}

// Função para buscar rota (não cria, apenas busca)
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

// Função para buscar todas as faixas de peso do banco (não cria)
async function buscarTodasFaixasPeso() {
  const faixas = await FaixasPeso.findAll({
    where: { ativa: true },
    order: [["peso_maximo", "ASC"]],
  });
  return faixas;
}

// Função principal de importação
async function importarCSV() {
  try {
    console.log("🚀 Iniciando importação do CSV...\n");

    // Ler arquivo CSV
    const csvPath = path.join(__dirname, "..", "Transp.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    // Parse do CSV
    const records = parse(csvContent, {
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`📊 Total de registros no CSV: ${records.length}\n`);

    // Buscar todas as faixas de peso do banco
    console.log("📦 Buscando faixas de peso do banco...");
    const faixasBanco = await buscarTodasFaixasPeso();
    console.log(
      `✅ ${faixasBanco.length} faixas de peso encontradas no banco\n`
    );

    let processados = 0;
    let erros = 0;
    const dataVigencia = new Date(); // Data atual como vigência inicial

    // Processar cada linha do CSV
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
            `⚠️  Linha ignorada (dados incompletos): ${JSON.stringify(record)}`
          );
          erros++;
          continue;
        }

        // Buscar entidades relacionadas (não cria, apenas busca)
        const estado = await buscarEstado(uf);
        const cidadeOrigem = await buscarCidade(cidadeOrigemNome, estado);
        const cidadeDestino = await buscarCidade(cidadeDestinoNome, estado);
        const transportadora = await buscarTransportadora(transportadoraNome);
        const rota = await buscarRota(cidadeOrigem, cidadeDestino);

        // Processar cada faixa de peso do CSV
        for (const faixaCSV of faixasPesoMap) {
          const valorPreco = converterValor(record[faixaCSV.coluna]);

          if (valorPreco !== null && valorPreco > 0) {
            // Encontrar a faixa do banco que corresponde ao peso máximo do CSV
            const faixaBanco = encontrarFaixaBanco(
              faixaCSV.pesoMaximoCSV,
              faixasBanco
            );

            if (!faixaBanco) {
              console.log(
                `⚠️  Faixa não encontrada para ${faixaCSV.descricao} (peso máximo: ${faixaCSV.pesoMaximoCSV}kg)`
              );
              continue;
            }

            // Verificar se já existe preço para esta combinação
            const precoExistente = await PrecosFaixas.findOne({
              where: {
                id_rota: rota.id_rota,
                id_faixa: faixaBanco.id_faixa,
                id_transportadora: transportadora.id_transportadora,
                data_vigencia_inicio: dataVigencia,
              },
            });

            if (!precoExistente) {
              // Converter taxas
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
          console.log(`📈 Processados: ${processados}/${records.length}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar linha:`, error.message);
        erros++;
      }
    }

    console.log("\n✅ Importação concluída!");
    console.log(`📊 Total processado: ${processados}`);
    console.log(`❌ Total de erros: ${erros}`);
  } catch (error) {
    console.error("❌ Erro na importação:", error);
    throw error;
  }
}

// Executar importação
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão com banco de dados estabelecida.\n");

    await importarCSV();

    await sequelize.close();
    console.log("\n✅ Conexão fechada.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
})();
