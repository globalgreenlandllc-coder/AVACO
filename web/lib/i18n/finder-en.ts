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
    badge: "Add-on · Career Fit",
    title: "Your career fit",
    lead: "Take this report into your working life, two ways: choose an industry and see where you fit within it, or let AVOCO find the industries that fit you best.",
    choose: {
      eyebrow: "Option 1 · Your choice",
      title: "Career Fit: Choose an Industry",
      text: "See where you fit within any industry. Choose the one you love or aspire to and discover which roles fit your profile best, how they rank for you, and which career paths align most closely with your natural strengths.",
    },
  },
  offer: {
    eyebrow: "Option 2 · Recommended",
    title: "Find My Best-Fit Industry",
    text: "Not sure which direction fits you best? We compare your profile across all {n} industries to identify your strongest matches, best-fit roles, and the career directions most aligned with your personality and strengths, plus your top five industries from different fields.",
    price: "{price} · or {n} credits",
    free: "Free on this page",
    freeAdmin: "Free for admins · clients pay {n} credits",
    find: "Find my best-fit industry",
    findCredits: "Find my best-fit industry · {n} credits",
    findAdmin: "Find my best-fit industry (free for admins)",
    getCredits: "Get credits",
    need: "This uses {n} credits.",
    youHave: "You have {have}.",
    finding: "Assessing all industries…",
    error: "This could not be opened just now. Please try again.",
    paid: "Payment received. Your best-fit industry is below.",
    paidPending: "Payment received. Your best-fit industry will open in a moment.",
    open: "Opened",
    show: "Show my best-fit industry",
    hide: "Hide",
  },
  result: {
    eyebrow: "Your best-fit industry · compared across all {n}",
    why: "Of the {n} industries assessed, {industry} is the strongest fit for your profile. Your strongest role here scores {peak}, your three strongest roles average {depth}, and the industry as a whole draws on your types at {typeFit}.",
    roleTitle: "Your strongest role",
    pathTitle: "Your path to it",
    scoresTitle: "Why it ranks first",
    scores: { peak: "Strongest role", depth: "Three strongest roles", typeFit: "Industry-wide fit with your types" },
    scoresHelp: "The match score weights your strongest role at 50%, your three strongest roles at 30% and the industry-wide fit at 20%.",
    topTitle: "Your top five industries",
    topNote: "Drawn from different fields, never more than two from the same area, so each is a genuine alternative.",
    bestTag: "Best fit",
    explore: "Explore",
    otherRole: "strongest role: {role} ({score})",
    openChapter: "Open Career Fit for {industry}",
    note: "This assessment is the platform's reading of your type scores across all industries, not part of AVOCO's result.",
  },
};
