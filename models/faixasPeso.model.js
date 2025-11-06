const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.config");

const FaixasPeso = sequelize.define(
  "FaixasPeso",
  {
    id_faixa: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    peso_minimo: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    peso_maximo: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    descricao: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    ordem_faixa: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    tableName: "faixas_peso",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = FaixasPeso;
