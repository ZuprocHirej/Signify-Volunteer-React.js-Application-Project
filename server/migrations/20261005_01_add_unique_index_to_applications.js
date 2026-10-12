/**
 * Migration: Add unique index on (account_id, volunteer_id) to applications table.
 *
 * Before applying the UNIQUE index:
 * 1. Queries for any existing duplicate (account_id, volunteer_id) pairs.
 * 2. Logs every duplicate row found (id, account_id, volunteer_id, created_at) to the console.
 * 3. Requires explicit confirmation before deleting any duplicate rows (never deletes silently).
 * 4. Adds composite UNIQUE index `unique_account_volunteer` to prevent duplicate applications.
 */

async function getApplicationTableName(sequelize) {
  const [appTable] = await sequelize.query("SHOW TABLES LIKE 'applications'");
  return appTable.length > 0 ? "applications" : "users";
}

export async function up(queryInterface, Sequelize, { sequelize, promptConfirm }) {
  const table = await getApplicationTableName(sequelize);

  // 1. Scan for duplicates
  const [duplicateRows] = await sequelize.query(`
    SELECT
      u.id,
      u.account_id,
      u.volunteer_id,
      COALESCE(u.submitted_at, 'N/A') AS created_at
    FROM \`${table}\` u
    INNER JOIN (
      SELECT account_id, volunteer_id
      FROM \`${table}\`
      WHERE account_id IS NOT NULL
      GROUP BY account_id, volunteer_id
      HAVING COUNT(*) > 1
    ) dups ON u.account_id = dups.account_id AND u.volunteer_id = dups.volunteer_id
    ORDER BY u.account_id, u.volunteer_id, u.id ASC
  `);

  if (duplicateRows.length > 0) {
    console.log(`\n⚠️  Found ${duplicateRows.length} duplicate application row(s) in '${table}' table:`);
    console.table(
      duplicateRows.map((row) => ({
        id: row.id,
        account_id: row.account_id,
        volunteer_id: row.volunteer_id,
        created_at: row.created_at,
      }))
    );

    const confirmed = await promptConfirm(
      `⚠️ Do you want to delete these duplicate records (keeping the earliest application ID for each account_id, volunteer_id pair)? [y/N]:`
    );

    if (!confirmed) {
      throw new Error(
        `Migration aborted by user: Duplicate rows exist in '${table}' table and were not approved for deletion. Unique index cannot be created.`
      );
    }

    await sequelize.query(`
      DELETE u1 FROM \`${table}\` u1
      INNER JOIN \`${table}\` u2
      WHERE u1.id > u2.id
        AND u1.account_id IS NOT NULL
        AND u1.account_id = u2.account_id
        AND u1.volunteer_id = u2.volunteer_id
    `);
    console.log("✅ Removed duplicate application rows.");
  } else {
    console.log("ℹ️ No duplicate (account_id, volunteer_id) pairs found.");
  }

  // 2. Add unique index if not already present
  const [indexes] = await sequelize.query(
    `SHOW INDEX FROM \`${table}\` WHERE Key_name = 'unique_account_volunteer'`
  );

  if (indexes.length === 0) {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD UNIQUE INDEX unique_account_volunteer (account_id, volunteer_id)`
    );
    console.log(`✅ Added composite UNIQUE index on (account_id, volunteer_id) to '${table}' table.`);
  } else {
    console.log(`ℹ️ Index 'unique_account_volunteer' already exists on '${table}' table.`);
  }
}

export async function down(queryInterface, Sequelize, { sequelize }) {
  const table = await getApplicationTableName(sequelize);
  const [indexes] = await sequelize.query(
    `SHOW INDEX FROM \`${table}\` WHERE Key_name = 'unique_account_volunteer'`
  );

  if (indexes.length > 0) {
    await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX unique_account_volunteer`);
    console.log(`✅ Dropped UNIQUE index 'unique_account_volunteer' from '${table}' table.`);
  } else {
    console.log(`ℹ️ Index 'unique_account_volunteer' does not exist on '${table}' table.`);
  }
}
