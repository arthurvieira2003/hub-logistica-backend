const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.config");
const Estados = require("./estados.model");

const Cidades = sequelize.define(
  "Cidades",
  {
    id_cidade: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nome_cidade: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    id_estado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Estados,
        key: "id_estado",
      },
    },
    codigo_ibge: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "cidades",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Estabelecendo relacionamento com o estado
Cidades.belongsTo(Estados, { foreignKey: "id_estado" });
Estados.hasMany(Cidades, { foreignKey: "id_estado" });

module.exports = Cidades;
