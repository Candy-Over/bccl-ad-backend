import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv.config();
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
