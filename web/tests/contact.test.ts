import { describe, expect, it } from "vitest";

import { CONTACT_TOPIC_LINKS, mailto, organizationJsonLd } from "@/lib/contact";
import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";

describe("contact block", () => {
  it("has one first-step link per topic in both languages", () => {
    expect(en.contact.topics).toHaveLength(CONTACT_TOPIC_LINKS.length);
    expect(ru.contact.topics).toHaveLength(CONTACT_TOPIC_LINKS.length);
  });

  it("builds a mail link that survives spaces, line breaks and Cyrillic", () => {
    const href = mailto("support@avocousa.us", "Вопрос о моём отчёте", "Hello AVOCO,\n\nSent from avocousa.us");
    expect(href.startsWith("mailto:support@avocousa.us?subject=")).toBe(true);
    const url = new URL(href);
    expect(url.searchParams.get("subject")).toBe("Вопрос о моём отчёте");
    expect(url.searchParams.get("body")).toBe("Hello AVOCO,\n\nSent from avocousa.us");
  });

  it("describes the organisation for search engines without breaking out of the script tag", () => {
    const json = organizationJsonLd("https://www.avocousa.us", "AVOCO USA </script>", "support@avocousa.us");
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json)).toMatchObject({ "@type": "Organization", url: "https://www.avocousa.us", email: "support@avocousa.us" });
  });
});
