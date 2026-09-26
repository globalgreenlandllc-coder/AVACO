/** The picture a partner-invite link shows in iMessage, WhatsApp or email: who is inviting, and to what. */
import { ImageResponse } from "next/og";
import { getDict } from "@/lib/i18n";
import { matchByToken } from "@/lib/matches";
import { OG_SIZE, OgCard, ogFonts, ogLine, ogOptions } from "@/lib/og";

export const alt = "An invitation to an AVOCO couple's report";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, { t }] = await Promise.all([params, getDict()]);
  const match = await matchByToken(token).catch(() => null);
  const m = t.match;
  const title = match ? m.partnerTitle.replace("{a}", match.ownerName) : m.title;
  const sub = ogLine(match ? m.partnerIntro.replace("{a}", match.ownerName) : m.lead);
  const fonts = await ogFonts(`${m.stepCouple}${title}${sub}`);
  return new ImageResponse(<OgCard eyebrow={m.stepCouple} title={title} sub={sub} glyph="hearts" />, ogOptions(fonts));
}
