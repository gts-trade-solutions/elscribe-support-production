import mysql from "mysql2/promise";

type DbEnv = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
};

function getDbEnv(): DbEnv {
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

let _pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
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
    namedPlaceholders: true,
    timezone: "Z",
    decimalNumbers: true,
  });

  return _pool;
}

export async function query<T = any>(sql: string, params?: any): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

// For INSERT/UPDATE/DELETE where you need affectedRows/insertId.
export async function exec(sql: string, params?: any): Promise<any> {
  const [result] = await getPool().execute(sql, params);
  return result as any;
}

export async function rawQuery<T = any>(sql: string): Promise<T[]> {
  const [rows] = await getPool().query(sql);
  return rows as T[];
}

export async function rawExec(sql: string): Promise<any> {
  const [result] = await getPool().query(sql);
  return result as any;
}

export async function transaction<T>(
  fn: (tx: {
    query: <R = any>(sql: string, params?: any) => Promise<R[]>;
    exec: (sql: string, params?: any) => Promise<void>;
  }) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const tx = {
      query: async <R = any>(sql: string, params?: any) => {
        const [rows] = await conn.execute(sql, params);
        return rows as R[];
      },
      exec: async (sql: string, params?: any) => {
        await conn.execute(sql, params);
      },
    };

    const result = await fn(tx);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    throw err;
  } finally {
    conn.release();
  }
}
