import { eq } from "drizzle-orm";
import { db, workspaces } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { currentUserId } from "@/lib/page";
import { joinAction } from "../../w/actions";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, , { t }] = await Promise.all([params, currentUserId(), getDict()]);
  const [ws] = await db().select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.joinCode, code));
  if (!ws) return <p className="card mx-auto mt-10 max-w-lg p-10 text-center text-ink-2">{t.org.record.invalid}</p>;

  return (
    <form action={joinAction} className="card mx-auto mt-10 max-w-lg space-y-6 p-10 text-center">
      <h1 className="font-display text-4xl font-medium">{t.org.join.title.replace("{company}", ws.name)}</h1>
      <input type="hidden" name="code" value={code} />
      <button type="submit" className="btn">{t.org.join.go}</button>
    </form>
  );
}
