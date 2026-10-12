import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

/**
 * UserApplication — maps to the `applications` table.
 * Stores every submitted sign-up form (the 4-step application).
 * Linked to VolunteerOpportunity via volunteer_id.
 */
class UserApplication extends Model {}

UserApplication.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    volunteerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "volunteer_id",
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "account_id",
    },
    // Step 1: Personal Information
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "first_name",
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "last_name",
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Step 2: Availability & Experience
    availability: {
      type: DataTypes.TEXT, // stored as JSON string
      allowNull: false,
      defaultValue: "[]",
      get() {
        const raw = this.getDataValue("availability");
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue("availability", JSON.stringify(value ?? []));
      },
    },
    experience: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Step 3: Additional Information
    skills: {
      type: DataTypes.TEXT, // stored as JSON string
      allowNull: true,
      defaultValue: "[]",
      get() {
        const raw = this.getDataValue("skills");
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      },
      set(value) {
        this.setDataValue("skills", JSON.stringify(value ?? []));
      },
    },
    heardAbout: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "heard_about",
    },
    agreeTerms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "agree_terms",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      validate: { isIn: [["pending", "approved", "rejected"]] },
    },
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "submitted_at",
    },
  },
  {
    sequelize,
    modelName: "UserApplication",
    tableName: "applications",
    underscored: true,
    createdAt: false,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ["account_id", "volunteer_id"],
        name: "unique_account_volunteer",
      },
    ],
  }
);

export default UserApplication;
