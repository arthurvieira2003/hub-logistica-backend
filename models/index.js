require("./user.model");
require("./session.model");
require("./tracking.model");
require("./estados.model");
require("./cidades.model");
require("./transportadoras.model");
require("./rotas.model");
require("./faixasPeso.model");
require("./precosFaixas.model");

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
