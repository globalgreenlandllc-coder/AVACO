import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "AVOCO · Admin", robots: { index: false, follow: false } };

const TABS = [["/admin", "Overview"], ["/admin/users", "People"], ["/admin/companies", "Companies"], ["/admin/transactions", "Transactions"], ["/admin/settings", "Pricing and settings"]] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Admin</p><h1 className="mt-2 font-display text-5xl font-medium">Platform</h1></div>
        <p className="text-xs text-muted">{admin.email}</p>
      </div>
      <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-3 text-sm">
        {TABS.map(([href, label]) => <Link key={href} href={href} className="text-ink-2 hover:text-ink">{label}</Link>)}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
