const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.config");

const Transportadoras = sequelize.define(
  "Transportadoras",
  {
    id_transportadora: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nome_transportadora: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    razao_social: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: true,
    },
    telefone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    tableName: "transportadoras",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Transportadoras;
