/** The picture the site's address shows when shared: the brand mark, the promise, one line under it. */
import { ImageResponse } from "next/og";
import { getDict } from "@/lib/i18n";
import { OG_SIZE, OgCard, ogFonts, ogLine, ogOptions } from "@/lib/og";

export const alt = "AVOCO: your personality, read from your voice";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const { t } = await getDict();
  const sub = ogLine(t.home.lead, 120);
  const fonts = await ogFonts(`${t.home.eyebrow}${t.home.title}${sub}`);
  return new ImageResponse(<OgCard eyebrow={t.home.eyebrow} title={t.home.title} sub={sub} glyph="mark" />, ogOptions(fonts));
}
