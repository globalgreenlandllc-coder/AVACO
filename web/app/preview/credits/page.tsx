import { notFound } from "next/navigation";
import { CreditsExplainer } from "@/components/CreditsExplainer";
import { getDict } from "@/lib/i18n";
import { INDUSTRY_KEYS } from "@/lib/industries";

// The "what one credit opens" card of the credits page, with sample prices. Development only.
export default async function PreviewCredits() {
  if (process.env.NODE_ENV === "production") notFound();
  const { t } = await getDict();
  return <div className="space-y-6"><CreditsExplainer t={t} industries={INDUSTRY_KEYS.length} prices={{ industry: { credits: 1, card: "$4.90" }, best: { credits: 2, card: "$12.90" }, match: { credits: 2, card: "$14.90" } }} /></div>;
}
