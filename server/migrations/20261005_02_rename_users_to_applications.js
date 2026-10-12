/**
 * Migration: Rename 'users' table to 'applications'
 *
 * Background:
 * The 'users' table was a legacy naming artifact from an early schema iteration
 * that stored submitted volunteer application forms. Actual user accounts and
 * authentication credentials live in the 'accounts' table.
 *
 * This migration renames the table to 'applications' to eliminate ambiguity.
 */

export async function up(queryInterface, Sequelize, { sequelize }) {
  const [usersTables] = await sequelize.query("SHOW TABLES LIKE 'users'");
  const [appTables] = await sequelize.query("SHOW TABLES LIKE 'applications'");

  if (usersTables.length > 0 && appTables.length === 0) {
    await sequelize.query("RENAME TABLE `users` TO `applications`");
    console.log("✅ Renamed table 'users' to 'applications'.");
  } else if (appTables.length > 0) {
    console.log("ℹ️ Table 'applications' already exists.");
  } else {
    console.warn("⚠️ Neither 'users' nor 'applications' table was found.");
  }
}

export async function down(queryInterface, Sequelize, { sequelize }) {
  const [appTables] = await sequelize.query("SHOW TABLES LIKE 'applications'");
  const [usersTables] = await sequelize.query("SHOW TABLES LIKE 'users'");

  if (appTables.length > 0 && usersTables.length === 0) {
    await sequelize.query("RENAME TABLE `applications` TO `users`");
    console.log("✅ Renamed table 'applications' back to 'users'.");
  } else if (usersTables.length > 0) {
    console.log("ℹ️ Table 'users' already exists.");
  } else {
    console.warn("⚠️ Neither 'applications' nor 'users' table was found.");
  }
}
