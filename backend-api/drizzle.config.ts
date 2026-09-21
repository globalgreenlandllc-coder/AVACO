import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read Next.js env files by itself.
for (const file of [".env.local", ".env"]) {
  try { process.loadEnvFile(file); } catch { /* file is optional */ }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
