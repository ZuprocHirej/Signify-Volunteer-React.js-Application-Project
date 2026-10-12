import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { Sequelize } from "sequelize";
import sequelize, { ensureDatabase } from "../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../migrations");

async function initMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
      \`name\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function getAppliedMigrations() {
  const [rows] = await sequelize.query(
    "SELECT `name` FROM `SequelizeMeta` ORDER BY `name` ASC"
  );
  return new Set(rows.map((r) => r.name));
}

function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".js") && !file.startsWith("."))
    .sort();
}

async function promptConfirm(message) {
  if (
    process.argv.includes("--yes") ||
    process.argv.includes("-y") ||
    process.env.MIGRATE_AUTO_CONFIRM === "true"
  ) {
    return true;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const response = await rl.question(`${message} `);
    return /^y(es)?$/i.test(response.trim());
  } catch {
    return false;
  } finally {
    rl.close();
  }
}

async function runMigrate() {
  const args = process.argv.slice(2);
  const isStatus = args.includes("--status");
  const isUndo = args.includes("--undo") || args.includes("--down");

  await ensureDatabase();
  await sequelize.authenticate();
  await initMetaTable();

  const applied = await getAppliedMigrations();
  const allFiles = getMigrationFiles();

  if (isStatus) {
    console.log("\n📋 Migration Status:");
    console.log("------------------------------------------------------------");
    for (const file of allFiles) {
      const status = applied.has(file) ? "✅ APPLIED" : "⏳ PENDING";
      console.log(`  ${status.padEnd(12)} ${file}`);
    }
    console.log("------------------------------------------------------------\n");
    return;
  }

  if (isUndo) {
    const appliedList = allFiles.filter((f) => applied.has(f));
    if (appliedList.length === 0) {
      console.log("ℹ️ No migrations to undo.");
      return;
    }
    const lastFile = appliedList[appliedList.length - 1];
    console.log(`\n⏪ Rolling back migration: ${lastFile}...`);
    const filePath = path.join(migrationsDir, lastFile);
    const migration = await import(`file://${filePath}`);

    if (typeof migration.down !== "function") {
      throw new Error(`Migration ${lastFile} does not export a down() function.`);
    }

    await migration.down(sequelize.getQueryInterface(), Sequelize, {
      sequelize,
      promptConfirm,
    });
    await sequelize.query("DELETE FROM `SequelizeMeta` WHERE `name` = ?", {
      replacements: [lastFile],
    });
    console.log(`✅ Successfully reverted migration: ${lastFile}\n`);
    return;
  }

  const pending = allFiles.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("✅ Database schema is up to date. No pending migrations.");
    return;
  }

  console.log(`\n🚀 Found ${pending.length} pending migration(s):`);
  for (const file of pending) {
    console.log(`  - ${file}`);
  }
  console.log();

  for (const file of pending) {
    console.log(`▶️ Executing migration: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const migration = await import(`file://${filePath}`);

    if (typeof migration.up !== "function") {
      throw new Error(`Migration ${file} does not export an up() function.`);
    }

    await migration.up(sequelize.getQueryInterface(), Sequelize, {
      sequelize,
      promptConfirm,
    });

    await sequelize.query("INSERT INTO `SequelizeMeta` (`name`) VALUES (?)", {
      replacements: [file],
    });

    console.log(`✅ Completed migration: ${file}\n`);
  }

  console.log("🎉 All pending migrations applied successfully.\n");
}

runMigrate()
  .catch((err) => {
    console.error("\n❌ Migration failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
