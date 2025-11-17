const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.config");
const Cidades = require("./cidades.model");

const Rotas = sequelize.define(
  "Rotas",
  {
    id_rota: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_cidade_origem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cidades,
        key: "id_cidade",
      },
    },
    id_cidade_destino: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cidades,
        key: "id_cidade",
      },
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "rotas",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["id_cidade_origem", "id_cidade_destino"],
        name: "unique_id_cidade_origem_destino",
      },
    ],
  }
);

Rotas.belongsTo(Cidades, {
  foreignKey: "id_cidade_origem",
  as: "CidadeOrigem",
});
Rotas.belongsTo(Cidades, {
  foreignKey: "id_cidade_destino",
  as: "CidadeDestino",
});
Cidades.hasMany(Rotas, { foreignKey: "id_cidade_origem", as: "RotasOrigem" });
Cidades.hasMany(Rotas, { foreignKey: "id_cidade_destino", as: "RotasDestino" });

module.exports = Rotas;
