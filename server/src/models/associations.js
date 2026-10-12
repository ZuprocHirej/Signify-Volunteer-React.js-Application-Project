import VolunteerOpportunity from "./volunteerOpportunity.model.js";
import UserApplication from "./userApplication.model.js";
import Account from "./account.model.js";

// Main Application associations
UserApplication.belongsTo(VolunteerOpportunity, {
  foreignKey: "volunteer_id",
  as: "opportunity",
});

Account.hasMany(UserApplication, {
  foreignKey: "account_id",
  as: "applications",
});

UserApplication.belongsTo(Account, {
  foreignKey: "account_id",
  as: "account",
});

VolunteerOpportunity.hasMany(UserApplication, {
  foreignKey: "volunteer_id",
  as: "applications",
});

export {
  VolunteerOpportunity,
  UserApplication,
  Account,
};

