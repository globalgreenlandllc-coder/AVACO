/**
 * A signed-in person's first name and primary email, remembered for an hour. Pages that greet someone by name would
 * otherwise ask Clerk's servers on every view, and every such call shares one limit for the whole site (1,000 per
 * 10 seconds), which a busy day would reach. Inside a cached function nothing may read the current request, which
 * Clerk's own client does, so this asks Clerk's REST API with the secret key, as lib/admin.ts does. Only for display
 * and form defaults: anything that decides access asks Clerk fresh. Server only.
 */
import "server-only";
import { unstable_cache } from "next/cache";

export interface ClerkBasics { firstName: string | null; email: string | null }

const lookup = unstable_cache(async (userId: string): Promise<ClerkBasics | null> => {
  const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Clerk user lookup failed: ${res.status}`);
  const user = await res.json() as { first_name: string | null; primary_email_address_id: string | null; email_addresses: Array<{ id: string; email_address: string }> };
  return { firstName: user.first_name || null, email: user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ?? null };
}, ["clerk-basics-v1"], { revalidate: 3600 });

/** Null for nobody, for an open-host visitor (not a Clerk user), and when Clerk can't be reached: a page must not break on it. */
export async function clerkBasics(userId: string | null | undefined): Promise<ClerkBasics | null> {
  if (!userId?.startsWith("user_")) return null;
  return lookup(userId).catch((err) => { console.error("Clerk user lookup failed", err); return null; });
}
