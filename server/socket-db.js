const mysql = require("mysql2/promise");

function getDbEnv() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const database = process.env.DB_NAME;

  if (!host || !user || !database) {
    throw new Error(
      "Missing DB env vars. Required: DB_HOST, DB_USER, DB_NAME (and usually DB_PASSWORD, DB_PORT).",
    );
  }

  return {
    host,
    port: Number.parseInt(process.env.DB_PORT || "3306", 10),
    user,
    password: process.env.DB_PASSWORD || "",
    database,
    connectionLimit: Number.parseInt(
      process.env.DB_CONNECTION_LIMIT || "10",
      10,
    ),
  };
}

let _pool = null;
function getPool() {
  if (_pool) return _pool;
  const env = getDbEnv();
  _pool = mysql.createPool({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    database: env.database,
    waitForConnections: true,
    connectionLimit: env.connectionLimit,
    timezone: "Z",
    decimalNumbers: true,
  });
  return _pool;
}

async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function exec(sql, params) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

module.exports = { query, exec };
