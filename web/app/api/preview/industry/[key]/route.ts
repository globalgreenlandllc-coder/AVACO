/** GET — an industry chapter for the design preview's sample scores (app/preview). Development only. */
import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { isIndustry } from "@/lib/industries";
import { industryChapter } from "@/lib/industry-chapter";
import { zoneOf } from "@/lib/report";
import { SAMPLE_EMO, SAMPLE_PSY } from "@/lib/sample";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { key } = await ctx.params;
  if (!isIndustry(key)) return Response.json({ error: "not_found", message: "Unknown industry" }, { status: 404 });
  const { t, locale } = await getDict();
  const types = SAMPLE_PSY.map(([k, value]) => ({ key: k, label: k, value, zone: zoneOf(value) }));
  const chapter = industryChapter(key, types, t, locale, SAMPLE_EMO.map(([k, value]) => ({ key: k, label: k, value })));
  return chapter ? Response.json(chapter) : Response.json({ error: "not_found", message: "No chapter" }, { status: 404 });
}
