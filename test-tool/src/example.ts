/**
 * Usage:
 *   npx tsx src/example.ts path/to/audio.wav          # sync
 *   npx tsx src/example.ts path/to/audio.wav --async  # callback mode
 */
import "dotenv/config";
import {
  AvocoClient, withLabels, psytypeZone, PSYTYPE_LABELS, EMOSTATE_LABELS,
} from "./avocoClient.js";

const avoco = new AvocoClient({
  username: process.env.AVOCO_API_USER!,
  password: process.env.AVOCO_API_PASSWORD!,
});

const [file, flag] = process.argv.slice(2);
if (!file) throw new Error("Pass an audio file path (30s–10min, ≤10 MB)");

if (flag === "--async") {
  const cb = `${process.env.AVOCO_CALLBACK_BASE_URL}/webhooks/avoco?secret=${process.env.AVOCO_CALLBACK_SECRET}`;
  console.log(await avoco.submitPsytype(file, cb));
  console.log(await avoco.submitEmostate(file, cb));
} else {
  const [psy, emo] = await Promise.all([avoco.analyzePsytype(file), avoco.analyzeEmostate(file)]);

  console.log("\nPsychotype:");
  for (const t of withLabels(psy.psy_types, PSYTYPE_LABELS))
    console.log(`  ${t.label.padEnd(12)} ${t.value.toFixed(1).padStart(5)}%  ${psytypeZone(t.value)}`);

  console.log("\nEmotional state:");
  for (const s of withLabels(emo.emo_scales, EMOSTATE_LABELS))
    console.log(`  ${s.label.padEnd(24)} ${String(Math.round(s.value)).padStart(3)}%`);
}
