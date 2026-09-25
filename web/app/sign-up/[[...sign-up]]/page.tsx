import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { getDict } from "@/lib/i18n";

export default async function Page() {
  const { t } = await getDict();
  const a = t.legal.agree;
  return (
    <div className="flex flex-col items-center gap-5 pt-8">
      <SignUp />
      <p className="max-w-sm text-center text-xs leading-relaxed text-muted">
        {a.before} <Link href="/terms" className="text-accent-text hover:underline">{a.terms}</Link> {a.and}{" "}
        <Link href="/privacy" className="text-accent-text hover:underline">{a.privacy}</Link>.
      </p>
    </div>
  );
}
