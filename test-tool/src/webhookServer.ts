/**
 * Receives AVOCO async results.
 * AVOCO doesn't sign callbacks, so we put a secret in the callback URL and check it.
 * Run: npx tsx src/webhookServer.ts
 */
import "dotenv/config";
import express from "express";
import type { CallbackPayload } from "./avocoClient.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const SECRET = process.env.AVOCO_CALLBACK_SECRET!;
const PORT = Number(process.env.PORT ?? 3000);

app.post("/webhooks/avoco", async (req, res) => {
  if (req.query.secret !== SECRET) return res.sendStatus(403);

  const payload = req.body as CallbackPayload;
  if (!payload?.id) return res.status(400).send("missing id");

  if ("psy_types" in payload) {
    console.log(`[psytype] ${payload.id}`, payload.psy_types);
    // TODO: save to DB, keyed by payload.id
  } else if ("emo_scales" in payload) {
    console.log(`[emostate] ${payload.id}`, payload.emo_scales);
    // TODO: save to DB, keyed by payload.id
  } else {
    console.warn("Unknown callback payload", payload);
  }
  res.sendStatus(200); // acknowledge fast; do heavy work async
});

app.listen(PORT, () => console.log(`AVOCO webhook listening on :${PORT}/webhooks/avoco`));
