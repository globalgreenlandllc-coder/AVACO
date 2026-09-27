/** Words for the best-industry finder (lib/industries.ts industryMatches) and the sector groups of the industry picker. */
export interface FinderText {
  sectors: { people: string; business: string; tech: string; making: string; creative: string; service: string };
  offer: {
    eyebrow: string; title: string; text: string; price: string; free: string; freeAdmin: string;
    find: string; findCredits: string; findAdmin: string; getCredits: string; need: string; youHave: string;
    finding: string; error: string; paid: string; paidPending: string; open: string; show: string; hide: string;
  };
  result: {
    eyebrow: string; why: string; roleTitle: string; pathTitle: string; scoresTitle: string;
    scores: { peak: string; depth: string; typeFit: string }; scoresHelp: string;
    othersTitle: string; otherRole: string; openChapter: string; note: string;
  };
}

export const finderEn: FinderText = {
  sectors: {
    people: "People and care",
    business: "Business and money",
    tech: "Technology and science",
    making: "Building and making",
    creative: "Creative and media",
    service: "Service, travel and safety",
  },
  offer: {
    eyebrow: "Or let us find it for you",
    title: "Your best industry",
    text: "Not sure which industry to open? We compare your type with every one of the {n} industries and open the one where you fit best: why it wins, your best role in it, the path to that role, and the closest alternatives.",
    price: "{price} · or {n} credits",
    free: "Free on this page",
    freeAdmin: "Free for admins · clients pay {n} credits",
    find: "Find my best industry",
    findCredits: "Find it for {n} credits",
    findAdmin: "Find it (free for admins)",
    getCredits: "Get credits",
    need: "Finding it takes {n} credits.",
    youHave: "You have {have}.",
    finding: "Comparing all industries…",
    error: "It could not be opened just now. Try again.",
    paid: "Payment received. Here is your best industry.",
    paidPending: "Payment received. Your best industry opens in a moment.",
    open: "Opened",
    show: "Show my best industry",
    hide: "Hide",
  },
  result: {
    eyebrow: "Your best industry · compared with all {n}",
    why: "Out of {n} industries, {industry} fits your type best. Your best role here scores {peak}, your three best roles average {depth}, and the industry as a whole leans on your types at {typeFit}.",
    roleTitle: "Your best role here",
    pathTitle: "How to get there",
    scoresTitle: "Why it wins",
    scores: { peak: "Your best role", depth: "Your three best roles", typeFit: "The whole industry's fit with your types" },
    scoresHelp: "The match counts your best role at one half, your three best roles at three tenths and the fit of the whole industry at one fifth.",
    othersTitle: "The closest alternatives",
    otherRole: "best role: {role} ({score})",
    openChapter: "Open the full {industry} chapter",
    note: "This is the platform's reading of your type scores across all industries, not part of AVOCO's result.",
  },
};
