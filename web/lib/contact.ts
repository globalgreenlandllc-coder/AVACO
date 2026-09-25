/**
 * The contact block: one mailbox, sorted by topic. The topic texts live in the dictionary (t.contact.topics);
 * this file holds what must not be translated: where each topic's "first step" link goes, in the same order.
 */
export const CONTACT_TOPIC_LINKS: ReadonlyArray<{ href: string; needsAccount: boolean }> = [
  { href: "/reports", needsAccount: true }, // my report
  { href: "/docs/api", needsAccount: false }, // for companies
  { href: "/credits", needsAccount: true }, // credits and payments
  { href: "/privacy", needsAccount: false }, // my data
];

/** A mail link with the subject and body filled in; encoded so spaces, line breaks and Cyrillic survive every mail app. */
export function mailto(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Structured data for search engines: who runs the site and how to reach them. Safe to inline in a script tag. */
export function organizationJsonLd(origin: string, name: string, email: string): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: origin,
    email,
    contactPoint: [{ "@type": "ContactPoint", email, contactType: "customer support", availableLanguage: ["en", "ru"] }],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
