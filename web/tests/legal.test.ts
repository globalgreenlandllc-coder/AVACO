import { describe, expect, it } from "vitest";

import { flatten } from "@/lib/i18n/flat";
import { legalEn } from "@/lib/i18n/legal-en";
import { legalRu } from "@/lib/i18n/legal-ru";
import { fillLegal, LEGAL, LEGAL_SLUGS, legalVars } from "@/lib/legal";

const placeholders = (s: string) => [...s.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).sort();

describe("legal texts", () => {
  const en = flatten(legalEn);
  const ru = flatten(legalRu);

  it("have the same shape in English and Russian, down to every bullet and table cell", () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  });

  it("use only placeholders that lib/legal.ts can fill, the same ones in both languages", () => {
    const known = Object.keys(legalVars());
    for (const [path, text] of Object.entries(en)) {
      const used = placeholders(text);
      for (const name of used) expect(known, `${path} uses {${name}}`).toContain(name);
      expect(placeholders(ru[path]), path).toEqual(used);
    }
  });

  it("have exactly one anchor per section, all distinct", () => {
    for (const kind of ["privacy", "terms"] as const) {
      expect(LEGAL_SLUGS[kind]).toHaveLength(legalEn[kind].sections.length);
      expect(new Set(LEGAL_SLUGS[kind]).size).toBe(LEGAL_SLUGS[kind].length);
    }
  });

  it("have a title and a paragraph in every section, and rectangular tables", () => {
    for (const doc of [legalEn.privacy, legalEn.terms, legalRu.privacy, legalRu.terms]) {
      expect(doc.inShort.length).toBeGreaterThanOrEqual(4);
      for (const section of doc.sections) {
        expect(section.title.length).toBeGreaterThan(2);
        expect(section.paras.length).toBeGreaterThan(0);
        if (section.table) for (const row of section.table.rows) expect(row, section.title).toHaveLength(section.table.head.length);
      }
    }
  });

  it("carry a date and a version to bump together", () => {
    expect(LEGAL.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(LEGAL.version).toMatch(/^\d+\.\d+$/);
    expect(LEGAL.email).toContain("@");
  });

  it("fill known placeholders and leave unknown ones visible", () => {
    expect(fillLegal("Write to {email} at {site}; {nope}", { email: "a@b.c", site: "x.y" })).toBe("Write to a@b.c at x.y; {nope}");
    expect(fillLegal(legalEn.privacy.lead, legalVars())).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});
