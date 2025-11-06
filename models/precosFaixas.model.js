const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.config");
const Rotas = require("./rotas.model");
const FaixasPeso = require("./faixasPeso.model");
const Transportadoras = require("./transportadoras.model");

const PrecosFaixas = sequelize.define(
  "PrecosFaixas",
  {
    id_preco: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_rota: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Rotas,
        key: "id_rota",
      },
    },
    id_faixa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: FaixasPeso,
        key: "id_faixa",
      },
    },
    id_transportadora: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Transportadoras,
        key: "id_transportadora",
      },
    },
    preco: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    tx_embarque: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    frete_peso: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    tx_adm: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    gris: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    tde: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    taxa_quimico: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    pedagio: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    data_vigencia_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    data_vigencia_fim: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    tableName: "precos_faixas",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Estabelecendo relacionamentos
PrecosFaixas.belongsTo(Rotas, { foreignKey: "id_rota" });
PrecosFaixas.belongsTo(FaixasPeso, { foreignKey: "id_faixa" });
PrecosFaixas.belongsTo(Transportadoras, { foreignKey: "id_transportadora" });
Rotas.hasMany(PrecosFaixas, { foreignKey: "id_rota" });
FaixasPeso.hasMany(PrecosFaixas, { foreignKey: "id_faixa" });
Transportadoras.hasMany(PrecosFaixas, { foreignKey: "id_transportadora" });

module.exports = PrecosFaixas;
