/** The picture a gift link shows in iMessage, WhatsApp or email: who it is from, and the message. */
import { ImageResponse } from "next/og";
import { giftByToken } from "@/lib/gifts";
import { getDict } from "@/lib/i18n";
import { OG_SIZE, OgCard, ogFonts, ogLine, ogOptions } from "@/lib/og";

export const alt = "A gift: an AVOCO voice report";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, { t }] = await Promise.all([params, getDict()]);
  const gift = await giftByToken(token).catch(() => null);
  const g = t.gift.recipient;
  const title = gift ? (gift.recipientName ? g.titleNamed.replace("{recipient}", gift.recipientName) : g.title).replace("{giver}", gift.giverName) : t.gift.landing.title;
  const sub = ogLine(gift?.message ? `“${gift.message}”` : g.noPay);
  const fonts = await ogFonts(`${g.eyebrow}${title}${sub}`);
  return new ImageResponse(<OgCard eyebrow={g.eyebrow} title={title} sub={sub} glyph="gift" />, ogOptions(fonts));
}
