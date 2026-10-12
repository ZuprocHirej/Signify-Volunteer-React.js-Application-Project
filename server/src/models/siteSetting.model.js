import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class SiteSetting extends Model {}

SiteSetting.init(
  {
    key: {
      type: DataTypes.STRING(100),
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "SiteSetting",
    tableName: "site_settings",
    underscored: true,
    timestamps: false,
  }
);

export default SiteSetting;
