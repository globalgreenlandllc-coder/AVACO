/** Words for the payment receipt emailed after every card payment (lib/receipts.ts). Placeholders are in {braces}. */
export interface ReceiptText {
  subject: string;
  preheader: string;
  title: string;
  thanks: string;
  number: string;
  date: string;
  paidWith: string;
  card: string;
  sentTo: string;
  item: string;
  total: string;
  items: { report: string; credits: string; companyCredits: string; industry: string; best: string; match: string; gift: string; giftFor: string };
  giftContents: { reports: string; industries: string; best: string; matches: string };
  next: {
    report: { lead: string; cta: string };
    credits: { lead: string; cta: string };
    company: { lead: string; cta: string };
    industry: { lead: string; cta: string };
    best: { lead: string; cta: string };
    match: { lead: string; cta: string };
    gift: { lead: string; cta: string };
  };
  stripe: string;
  help: string;
  /** Shown only for credit packs: a report, a chapter or a relationship report uses its credit at once. */
  refund: string;
  why: string;
}

export const receiptEn: ReceiptText = {
  subject: "Your AVOCO receipt · {amount}",
  preheader: "Payment received: {item}. Thank you.",
  title: "Receipt",
  thanks: "Thank you. Your payment went through.",
  number: "Receipt no.",
  date: "Date",
  paidWith: "Paid with",
  card: "{brand} ending in {last4}",
  sentTo: "Sent to",
  item: "Item",
  total: "Total paid",
  items: {
    report: "Complete Personality Analysis",
    credits: "Report credits × {n}",
    companyCredits: "Company report credits × {n}",
    industry: "Career Fit · {industry}",
    best: "Best-Fit Industry · every industry compared",
    match: "Relationship & Compatibility · {a} & {b}",
    gift: "Gift",
    giftFor: "Gift for {name}",
  },
  giftContents: { reports: "Complete Personality Analysis × {n}", industries: "Career Fit × {n}", best: "Best-Fit Industry × {n}", matches: "Relationship & Compatibility × {n}" },
  next: {
    report: { lead: "Your full report is open and stays in your account.", cta: "Open your report" },
    credits: { lead: "Your credits are in your account and never expire. Each one opens a full report.", cta: "See your credits" },
    company: { lead: "The credits are in the company workspace. Each one covers one person's recording.", cta: "Open the workspace" },
    industry: { lead: "Career Fit for this industry is open in the add-ons of your report.", cta: "Open Career Fit" },
    best: { lead: "Your Best-Fit Industry is open in the add-ons of your report, with its best role and the full industry reading.", cta: "See your Best-Fit Industry" },
    match: { lead: "Your compatibility report is paid for. It is ready as soon as both of you have recorded.", cta: "Open the compatibility report" },
    gift: { lead: "Your gift is ready. Send its private link whenever you like.", cta: "Get the gift link" },
  },
  stripe: "Card receipt from Stripe",
  help: "Questions about this payment? Reply to this email or write to {email}.",
  refund: "Bought by mistake? Write to us within 14 days and we refund the credits you have not used.",
  why: "You receive this email because you paid on {site} while signed in as {to}.",
};
