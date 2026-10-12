import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class Testimonial extends Model {}

Testimonial.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    quote: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Testimonial",
    tableName: "testimonials",
    underscored: true,
    timestamps: true,
  }
);

export default Testimonial;
