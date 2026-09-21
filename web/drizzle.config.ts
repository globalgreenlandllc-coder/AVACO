import { defineConfig } from "drizzle-kit";

for (const file of [".env.local", ".env"]) {
  try { process.loadEnvFile(file); } catch { /* file is optional */ }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  // The gateway keeps its tables in the same database; its own migration log must stay separate from ours.
  migrations: { table: "__drizzle_migrations_web", schema: "public" },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
