import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

/**
 * VolunteerOpportunity — maps to the `volunteers` table.
 * Stores the opportunity cards shown on the Home page.
 * (Named to avoid collision with the original Volunteer model
 *  which stores individual volunteer people.)
 */
class VolunteerOpportunity extends Model {}

VolunteerOpportunity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    spotsLeft: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "spots_left",
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
      field: "image_url",
    },
    isPriority: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_priority",
    },
    sessionDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      field: "session_details",
    },
    teamDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      field: "team_details",
    },
    preparationDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      field: "preparation_details",
    },
  },
  {
    sequelize,
    modelName: "VolunteerOpportunity",
    tableName: "volunteers",
    underscored: true,
    updatedAt: false,
  }
);

export default VolunteerOpportunity;
