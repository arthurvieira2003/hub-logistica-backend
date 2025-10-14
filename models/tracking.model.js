const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.config");

const Tracking = sequelize.define(
  "tracking",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    serial: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    seriesStr: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    taxIdNum: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    carrierName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    docEntry: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    docNum: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    trackingData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["serial", "seriesStr", "taxIdNum", "carrierName"],
      },
    ],
  }
);

module.exports = Tracking;
