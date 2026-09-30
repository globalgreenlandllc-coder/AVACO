import { describe, expect, it } from "vitest";
import { normalizePath, pageName } from "@/lib/visits-math";

describe("page names for the admin", () => {
  it("names every page of the app in plain words, never with a slash", () => {
    const named: Array<[string, string]> = [
      ["/", "Landing page"], ["/sample", "Sample report"], ["/technology", "The technology page"], ["/record", "Recording page"],
      ["/reports", "My reports"], ["/reports/[id]", "A report"], ["/credits", "Credits and prices"], ["/gift", "Gift builder"], ["/gift/[id]", "A gift, after buying"],
      ["/g/[id]", "Gift link, as the recipient"], ["/match/[id]", "Couple's report"], ["/m/[id]", "Partner's private link"],
      ["/w", "Companies"], ["/w/[id]", "Company workspace"], ["/w/[id]/g/[id]", "Company workspace · a group"], ["/w/[id]/g/[id]/p/[id]", "Company workspace · a person"],
      ["/partners", "Partner page"], ["/partners/r/[id]", "Partner test report"], ["/sign-in/factor-one", "Sign-in"], ["/sign-up", "Sign-up"], ["/privacy", "Privacy policy"],
    ];
    for (const [path, name] of named) expect(pageName(path)).toBe(name);
    for (const [path] of named) expect(pageName(path)).not.toContain("/");
  });

  it("shows an unknown page without slashes or ids", () => {
    expect(pageName(normalizePath("/new-thing/8f2c1a9e-1111-4222-8333-444455556666/edit?x=1"))).toBe("new-thing › … › edit");
  });
});
