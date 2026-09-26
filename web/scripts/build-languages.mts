/**
 * Builds every language that is missing or out of date, from the command line instead of the admin page.
 * Same code path as the portal (lib/translate.ts), so the result is identical; this is just faster for 31 at once.
 *
 *   npm run languages:build           every language
 *   npm run languages:build -- de fr  only these
 *
 * Needs DATABASE_URL and SETTINGS_SECRET in .env.local (the DeepL key is read from the settings table).
 */
import { allProgress, buildLanguage, deeplStatus } from "../lib/translate";
import { TRANSLATABLE } from "../lib/i18n/languages";

const only = process.argv.slice(2);
const status = await deeplStatus();
if (!status.connected) { console.error("DeepL is not connected. Add the key in the admin portal first."); process.exit(1); }

const progress = await allProgress();
const todo = TRANSLATABLE
  .filter((l) => (only.length ? only.includes(l.code) : true))
  .filter((l) => { const p = progress.get(l.code); return !p || p.done < p.total; });
console.log(`${new Date().toISOString()} building ${todo.length} language(s): ${todo.map((l) => l.code).join(" ") || "(nothing to do)"}`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const l of todo) {
  let p = progress.get(l.code) ?? { done: 0, total: 0 };
  let failures = 0;
  for (;;) {
    try {
      p = await buildLanguage(l.code, "cli", 120);
      failures = 0;
      process.stdout.write(`\r${l.code} ${p.done}/${p.total}   `);
      if (p.done >= p.total) break;
    } catch (err) {
      failures += 1;
      const wait = Math.min(60_000, 5_000 * failures);
      console.error(`\n${l.code}: ${err instanceof Error ? err.message : err}; retrying in ${wait / 1000}s (${failures}/8)`);
      if (failures >= 8) { console.error(`${l.code}: giving up`); break; }
      await sleep(wait);
    }
  }
  console.log(`\r${l.code} ${p.done}/${p.total} done at ${new Date().toISOString()}`);
}
console.log(`${new Date().toISOString()} finished`);
process.exit(0);
