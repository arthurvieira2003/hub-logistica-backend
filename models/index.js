// Centralizando todas as importações dos modelos
// Isso garante que todos os modelos sejam carregados e registrados no Sequelize

require("./user.model");
require("./session.model");
require("./tracking.model");
require("./estados.model");
require("./cidades.model");
require("./transportadoras.model");
require("./rotas.model");
require("./faixasPeso.model");
require("./precosFaixas.model");

// Exportar os modelos para uso em outros arquivos se necessário
const User = require("./user.model");
const Session = require("./session.model");
const Tracking = require("./tracking.model");
const Estados = require("./estados.model");
const Cidades = require("./cidades.model");
const Transportadoras = require("./transportadoras.model");
const Rotas = require("./rotas.model");
const FaixasPeso = require("./faixasPeso.model");
const PrecosFaixas = require("./precosFaixas.model");

module.exports = {
  User,
  Session,
  Tracking,
  Estados,
  Cidades,
  Transportadoras,
  Rotas,
  FaixasPeso,
  PrecosFaixas,
};
