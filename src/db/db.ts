// import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({
  // path: `.env.${process.env.NODE_ENV || "development"}`,
  path: `.env.${process.env.NODE_ENV}`
});

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const getBaseUrl = (url: string) => {
  const parsed = new URL(url);
  const dbName = parsed.pathname.substring(1);
  parsed.pathname = "";
  return {
    baseUrl: parsed.toString(),
    dbName,
  };
};

const { baseUrl, dbName } = getBaseUrl(databaseUrl);

const ensureDatabaseExists = async () => {
  try {
    const connection = await mysql.createConnection(baseUrl);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();
    console.log(`Database "${dbName}" checked/created.`);
  } catch (error) {
    console.error("Error ensuring database exists:", error);
  }
};

await ensureDatabaseExists();

const connection = await mysql.createPool({
  uri: databaseUrl,
  connectionLimit: 10,
});

export const db = drizzle(connection, { schema, mode: "default" });
export { connection };
