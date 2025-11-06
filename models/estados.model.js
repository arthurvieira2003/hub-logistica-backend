const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.config");

const Estados = sequelize.define(
  "Estados",
  {
    id_estado: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uf: {
      type: DataTypes.CHAR(2),
      allowNull: false,
    },
    nome_estado: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    tableName: "estados",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Estados;
