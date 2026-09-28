import Link from "next/link";
import { getDict } from "@/lib/i18n";

/** A missing page: a short word and the two places worth going. */
export default async function NotFound() {
  const { t } = await getDict();
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-display text-5xl font-medium">{t.notFound.title}</h1>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-2">{t.notFound.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn">{t.notFound.home}</Link>
        <Link href="/reports" className="btn btn-quiet">{t.notFound.reports}</Link>
      </div>
    </div>
  );
}
