import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getDict } from "@/lib/i18n";

export default async function Home() {
  const [{ t }, { userId }] = await Promise.all([getDict(), auth()]);

  return (
    <div className="space-y-20 pt-6 sm:pt-14">
      <section className="max-w-3xl">
        <p className="eyebrow">{t.home.eyebrow}</p>
        <h1 className="mt-5 font-display text-5xl font-medium leading-[1.05] sm:text-7xl">{t.home.title}</h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-2">{t.home.lead}</p>
        <Link href={userId ? "/record" : "/sign-up"} className="btn mt-10">{userId ? t.home.cta : t.home.ctaSignedOut}</Link>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        {t.home.steps.map((step, i) => (
          <div key={step.title} className="card p-7">
            <p className="font-display text-4xl text-accent-text">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-4 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.text}</p>
          </div>
        ))}
      </section>

      <section className="max-w-2xl border-l-2 border-accent pl-6">
        <h2 className="font-display text-3xl font-medium">{t.home.privacyTitle}</h2>
        <p className="mt-3 leading-relaxed text-ink-2">{t.home.privacy}</p>
      </section>
    </div>
  );
}
