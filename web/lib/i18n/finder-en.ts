/**
 * Words for the career add-on's two offers (components/Industry.tsx): an industry of the person's choice, and the
 * best-match finder (lib/industries.ts industryMatches); the finder's result; and the sector groups of the picker.
 */
export interface FinderText {
  sectors: { people: string; business: string; tech: string; making: string; creative: string; service: string };
  cover: { badge: string; title: string; lead: string; choose: { eyebrow: string; title: string; text: string } };
  offer: {
    eyebrow: string; title: string; text: string; price: string; free: string; freeAdmin: string;
    find: string; findCredits: string; findAdmin: string; getCredits: string; need: string; youHave: string;
    finding: string; error: string; paid: string; paidPending: string; open: string; show: string; hide: string;
  };
  result: {
    eyebrow: string; why: string; roleTitle: string; pathTitle: string; scoresTitle: string;
    scores: { peak: string; depth: string; typeFit: string }; scoresHelp: string;
    topTitle: string; topNote: string; bestTag: string; explore: string; otherRole: string; openChapter: string; note: string;
  };
}

export const finderEn: FinderText = {
  sectors: {
    people: "People and care",
    business: "Business and finance",
    tech: "Technology and science",
    making: "Building and making",
    creative: "Creative and media",
    service: "Service, travel and safety",
  },
  cover: {
    badge: "Add-on · Career fit",
    title: "Your career fit",
    lead: "Take this report into your working life. Explore an industry you love or aspire to, or let us identify the one that fits you best.",
    choose: {
      eyebrow: "Option 1 · Your choice",
      title: "An industry of your choice",
      text: "Explore an industry you love or aspire to. Every role in it is ranked against your profile, with your route in and the points to watch.",
    },
  },
  offer: {
    eyebrow: "Option 2 · Recommended",
    title: "Your best-match industry",
    text: "We assess your profile against all {n} industries and identify where you are most likely to excel: your best-match industry, your strongest role in it and the path to that role, plus your top five industries from different fields.",
    price: "{price} · or {n} credits",
    free: "Free on this page",
    freeAdmin: "Free for admins · clients pay {n} credits",
    find: "Find my best match",
    findCredits: "Find my best match · {n} credits",
    findAdmin: "Find my best match (free for admins)",
    getCredits: "Get credits",
    need: "This uses {n} credits.",
    youHave: "You have {have}.",
    finding: "Assessing all industries…",
    error: "This could not be opened just now. Please try again.",
    paid: "Payment received. Your best-match industry is below.",
    paidPending: "Payment received. Your best-match industry will open in a moment.",
    open: "Opened",
    show: "Show my best match",
    hide: "Hide",
  },
  result: {
    eyebrow: "Your best-match industry · assessed against all {n}",
    why: "Of the {n} industries assessed, {industry} is the strongest fit for your profile. Your strongest role here scores {peak}, your three strongest roles average {depth}, and the industry as a whole draws on your types at {typeFit}.",
    roleTitle: "Your strongest role",
    pathTitle: "Your path to it",
    scoresTitle: "Why it ranks first",
    scores: { peak: "Strongest role", depth: "Three strongest roles", typeFit: "Industry-wide fit with your types" },
    scoresHelp: "The match score weights your strongest role at 50%, your three strongest roles at 30% and the industry-wide fit at 20%.",
    topTitle: "Your top five industries",
    topNote: "Drawn from different fields, never more than two from the same area, so each is a genuine alternative.",
    bestTag: "Best match",
    explore: "Explore",
    otherRole: "strongest role: {role} ({score})",
    openChapter: "Open the full {industry} chapter",
    note: "This assessment is the platform's reading of your type scores across all industries, not part of AVOCO's result.",
  },
};
