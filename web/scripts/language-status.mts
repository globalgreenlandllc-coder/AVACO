import { allProgress, deeplStatus, dictionaryCharacters } from "../lib/translate";
import { TRANSLATABLE } from "../lib/i18n/languages";
const status = await deeplStatus();
console.log("DeepL:", status.connected ? `connected via ${status.source}, key ${status.keyHint}, used ${status.usage?.used} of ${status.usage?.limit}` : "not connected");
console.log("dictionary characters per language:", dictionaryCharacters());
const progress = await allProgress();
for (const l of TRANSLATABLE) { const p = progress.get(l.code); console.log(`${l.code}\t${p ? `${p.done}/${p.total}` : "not added"}`); }
