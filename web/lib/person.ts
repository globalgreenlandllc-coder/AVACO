/**
 * Whose voice a report is: the pure part (lib/people.ts keeps the names in the database). A report without a name is the
 * account holder's own; names are matched without regard to case or spacing, so "anna" and "Anna " are one person.
 */
export const MAX_NAME = 60;

/** A name as it is kept: trimmed, single spaces, no control characters, at most 60 characters. Empty means "me". */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME).trim();
  return name || null;
}

/** The key a person is recognised by: "" for the account holder, otherwise the name in lower case. */
export const personKey = (name: string | null | undefined) => (cleanName(name) ?? "").toLocaleLowerCase();

/** Letters and digits of a name, for file names: "Anna Smith" → "anna-smith". */
export const nameSlug = (name: string) => name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");

export interface Person { key: string; name: string | null; count: number }

/**
 * The people behind a list of reports, the account holder first and then by most recent report; each with the
 * name as last written and how many reports are theirs. `reports` must be newest first, as the gateway lists them.
 */
export function peopleIn(reports: Array<{ id: string }>, names: Map<string, string>): Person[] {
  const found = new Map<string, Person>();
  for (const r of reports) {
    const name = names.get(r.id) ?? null;
    const key = personKey(name);
    const p = found.get(key);
    if (p) p.count++;
    else found.set(key, { key, name, count: 1 });
  }
  return [...found.values()].sort((a, b) => (a.key === "" ? -1 : b.key === "" ? 1 : 0));
}

/** Only the reports of one person (by key), in the order given. */
export const reportsOf = <T extends { id: string }>(reports: T[], names: Map<string, string>, key: string) =>
  reports.filter((r) => personKey(names.get(r.id)) === key);
