/**
 * Link previews (Open Graph images) for the links people send each other: the gift, the partner invite.
 * Drawn with next/og (Satori) on the report cover's dark gold. Fonts come from Google Fonts at request time,
 * only the glyphs the text needs, cached per process; without them Satori falls back to its built-in Latin font.
 */
import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

// Google Fonts serves woff2 to browsers, which Satori cannot read; a plain HTTP client is served TrueType.
const UA = "curl/8.7.1";
const cache = new Map<string, Promise<ArrayBuffer | null>>();

async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  const key = `${family}|${weight}|${text}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) })).text();
        const url = /src: url\(([^)]+)\) format\('(?:truetype|opentype|woff)'\)/.exec(css)?.[1];
        if (!url) return null;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        return res.ok ? res.arrayBuffer() : null;
      } catch {
        return null;
      }
    })());
  }
  return cache.get(key)!;
}

export interface OgFont { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }

/** The display and body fonts, for exactly these characters (so Cyrillic names render too). */
export async function ogFonts(text: string): Promise<OgFont[]> {
  const chars = Array.from(new Set(`${text}AVOCOavocousa.us`)).join("");
  const [display, body] = await Promise.all([googleFont("Cormorant Garamond", 600, chars), googleFont("Manrope", 400, chars)]);
  const fonts: OgFont[] = [];
  if (display) fonts.push({ name: "Cormorant Garamond", data: display, weight: 600, style: "normal" });
  if (body) fonts.push({ name: "Manrope", data: body, weight: 400, style: "normal" });
  return fonts;
}

const GOLD = "#ecb657", INK = "#fbf1dc", MUTED = "#cdbd98";

function GiftGlyph() {
  return (
    <svg width="104" height="104" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="24" fill="#120d05" />
      <rect x="20" y="44" width="56" height="34" rx="5" fill={GOLD} opacity="0.9" />
      <rect x="16" y="34" width="64" height="14" rx="4" fill={GOLD} />
      <rect x="44" y="34" width="8" height="44" fill="#120d05" opacity="0.55" />
      <ellipse cx="36" cy="27" rx="11" ry="7" fill="none" stroke={GOLD} strokeWidth="3.5" />
      <ellipse cx="60" cy="27" rx="11" ry="7" fill="none" stroke={GOLD} strokeWidth="3.5" />
      <circle cx="48" cy="31" r="4" fill={GOLD} />
    </svg>
  );
}

function MarkGlyph() {
  return (
    <svg width="104" height="104" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#120d05" />
      <path d="M32 13 L47.5 50 L40.5 50 L32 28.5 L23.5 50 L16.5 50 Z" fill={GOLD} />
      <rect x="26" y="41" width="12" height="4.2" rx="2.1" fill="#120d05" />
      <rect x="26" y="41" width="12" height="4.2" rx="2.1" fill={GOLD} opacity="0.9" />
    </svg>
  );
}

function HeartsGlyph() {
  return (
    <svg width="104" height="104" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="24" fill="#120d05" />
      <path d="M48 78 L21 51 a15 15 0 0 1 21-21 l6 6 6-6 a15 15 0 0 1 21 21 z" fill={GOLD} />
    </svg>
  );
}

/** One preview card: an eyebrow, a big title in the display face, a line under it, the brand at the foot. */
export function OgCard({ eyebrow, title, sub, glyph }: { eyebrow: string; title: string; sub: string; glyph: "gift" | "hearts" | "mark" }): ReactElement {
  const big = title.length <= 44;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", padding: 64, background: "linear-gradient(135deg, #1e1609 0%, #3a290d 100%)", color: INK, fontFamily: "Manrope, sans-serif" }}>
      <div style={{ position: "absolute", top: -140, right: 110, width: 180, height: 460, borderRadius: 999, background: "rgba(236,182,87,0.12)" }} />
      <div style={{ position: "absolute", top: -140, right: 110, width: 64, height: 280, borderRadius: 999, background: "rgba(236,182,87,0.55)" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {glyph === "gift" ? <GiftGlyph /> : glyph === "hearts" ? <HeartsGlyph /> : <MarkGlyph />}
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: GOLD }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1020 }}>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontWeight: 600, fontSize: big ? 84 : 64, lineHeight: 1.04, color: GOLD }}>{title}</div>
          <div style={{ marginTop: 26, fontSize: 30, lineHeight: 1.35, color: MUTED }}>{sub}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 28, letterSpacing: 9, color: INK }}>AVOCO</div>
          <div style={{ fontSize: 22, letterSpacing: 2, color: MUTED }}>avocousa.us</div>
        </div>
      </div>
    </div>
  );
}

/** ImageResponse options: the fonts when they loaded, otherwise nothing, so next/og uses its own built-in font. */
export const ogOptions = (fonts: OgFont[]) => (fonts.length ? { ...OG_SIZE, fonts } : OG_SIZE);

/** A line of a preview card, cut to a length that still fits. */
export const ogLine = (text: string, max = 150) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
