import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "server", ".env");
const defaultDumpPath = path.join(root, "database", "volunteer_app.sql");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function quoteIdentifier(identifier) {
  return `\`${identifier.replaceAll("`", "``")}\``;
}

function getConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || "3306",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "volunteer_app",
    dumpPath: path.resolve(root, process.env.DB_DUMP_FILE || defaultDumpPath),
  };
}

function getTool(name) {
  const binDir = process.env.MYSQL_BIN_DIR || (process.platform === "win32" ? "C:\\xampp\\mysql\\bin" : "/usr/bin");
  const executable = process.platform === "win32" ? `${name}.exe` : name;
  const candidate = path.join(binDir, executable);
  return fs.existsSync(candidate) ? candidate : executable;
}

function runTool(tool, args, config, options = {}) {
  const environment = { ...process.env };
  if (config.password) environment.MYSQL_PWD = config.password;

  const result = spawnSync(tool, args, {
    cwd: root,
    env: environment,
    stdio: options.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: options.input,
    windowsHide: false,
  });

  if (result.error) {
    throw new Error(`${tool} could not be started: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${tool} exited with code ${result.status}.`);
  }
}

function connectionArgs(config) {
  return ["--host", config.host, "--port", config.port, "--user", config.user];
}

function ensureDatabase(config) {
  runTool(getTool("mysql"), [
    ...connectionArgs(config),
    "--execute",
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.database)}`,
  ], config);
}

function exportDatabase(config) {
  fs.mkdirSync(path.dirname(config.dumpPath), { recursive: true });
  runTool(getTool("mysqldump"), [
    ...connectionArgs(config),
    "--single-transaction",
    "--routines",
    "--events",
    "--result-file",
    config.dumpPath,
    config.database,
  ], config);
  console.log(`Database exported to ${path.relative(root, config.dumpPath)}`);
}

function importDatabase(config) {
  if (!fs.existsSync(config.dumpPath)) {
    throw new Error(`Dump file not found: ${config.dumpPath}. Run npm run db:export on the other laptop first.`);
  }

  ensureDatabase(config);
  const dump = fs.readFileSync(config.dumpPath);
  runTool(getTool("mysql"), [
    ...connectionArgs(config),
    config.database,
  ], config, { input: dump });
  console.log(`Database imported from ${path.relative(root, config.dumpPath)}`);
}

function importSchema(config) {
  const schemaFile = path.resolve(root, "schema.sql");
  if (!fs.existsSync(schemaFile)) {
    throw new Error(`schema.sql not found at ${schemaFile}`);
  }
  const dump = fs.readFileSync(schemaFile);
  runTool(getTool("mysql"), connectionArgs(config), config, { input: dump });
  console.log("Database initialized from schema.sql successfully.");
}

loadEnv(envPath);
const action = process.argv[2];
const config = getConfig();

try {
  if (action === "export") {
    exportDatabase(config);
  } else if (action === "import") {
    importDatabase(config);
  } else if (action === "schema" || action === "setup") {
    importSchema(config);
  } else {
    throw new Error("Choose an action: export, import, or setup.");
  }
} catch (error) {
  console.error(`Database ${action || "sync"} failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
